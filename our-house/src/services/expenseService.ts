import {
    collection,
    doc,
    getDocs,
    query,
    setDoc,
    where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Expense, ExpenseShare } from '../models/Expense';
import type { User } from '../models/User';

const EXPENSES_STORAGE_KEY = 'our_house_expenses';

function getLocalExpenses(): Expense[] {
    try {
        const raw = localStorage.getItem(EXPENSES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Error al leer gastos locales:', e);
    }
    return [];
}

function saveLocalExpenses(expenses: Expense[]) {
    try {
        localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('our_house:expenses_change'));
        }
    } catch (e) {
        console.warn('Error al guardar gastos locales:', e);
    }
}

/**
 * HU11 — Cálculo automático de la cuota individual mediante distribución proporcional
 * 
 * Fórmula:
 *   TotalIngresos = Sum(Ingresos_participantes)
 *   Ci = MontoTotalGasto * (Ii / TotalIngresos)
 *   Redondeo al entero más cercano (moneda local COP)
 *   Residuo = MontoTotalGasto - Sum(Ci)
 *   El residuo se acredita o debita automáticamente al pagador del gasto
 *   Suma(Ci) == MontoTotalGasto exactamente
 */
export function calcularDistribucionProporcional(
    montoTotal: number,
    pagadorId: string,
    participantes: User[]
): {
    cuotas: Record<string, number>;
    desgloseCuotas: ExpenseShare[];
    residuoAjustado: number;
    totalIngresos: number;
} {
    if (!participantes || participantes.length === 0 || montoTotal <= 0) {
        return {
            cuotas: {},
            desgloseCuotas: [],
            residuoAjustado: 0,
            totalIngresos: 0,
        };
    }

    const n = participantes.length;
    // 1. Totalizar ingresos de los integrantes participantes
    const totalIngresos = participantes.reduce(
        (acc, p) => acc + (p.ingresoMensual > 0 ? p.ingresoMensual : 0),
        0
    );

    const cuotas: Record<string, number> = {};
    const desgloseCuotas: ExpenseShare[] = [];
    let sumaCuotasInicial = 0;

    // 2. Si todos tienen ingresos cero o no definidos, distribuir equitativamente
    if (totalIngresos <= 0) {
        const cuotaBase = Math.floor(montoTotal / n);
        let acumulado = 0;

        participantes.forEach((p, idx) => {
            const esUltimo = idx === n - 1;
            const cuota = esUltimo ? montoTotal - acumulado : cuotaBase;
            acumulado += cuota;
            cuotas[p.id] = cuota;
            desgloseCuotas.push({
                userId: p.id,
                nombre: p.nombre || 'Integrante',
                ingreso: 0,
                proporcion: 1 / n,
                cuota,
            });
        });

        return {
            cuotas,
            desgloseCuotas,
            residuoAjustado: 0,
            totalIngresos: 0,
        };
    }

    // 3. Distribución proporcional según ingresos
    participantes.forEach((p) => {
        const ingreso = p.ingresoMensual > 0 ? p.ingresoMensual : 0;
        const proporcion = ingreso / totalIngresos;
        // Redondeo al entero más cercano
        const cuotaCalculada = Math.round(montoTotal * proporcion);

        cuotas[p.id] = cuotaCalculada;
        sumaCuotasInicial += cuotaCalculada;

        desgloseCuotas.push({
            userId: p.id,
            nombre: p.nombre || 'Integrante',
            ingreso,
            proporcion,
            cuota: cuotaCalculada,
        });
    });

    // 4. Residuo de redondeo: MontoTotal - Suma(Cuotas)
    const residuo = montoTotal - sumaCuotasInicial;

    // 5. Ajustar residuo al pagador (si participa) o al primer participante
    if (residuo !== 0) {
        const targetId = cuotas[pagadorId] !== undefined ? pagadorId : participantes[0].id;
        cuotas[targetId] = (cuotas[targetId] || 0) + residuo;

        const shareItem = desgloseCuotas.find((s) => s.userId === targetId);
        if (shareItem) {
            shareItem.cuota += residuo;
        }
    }

    return {
        cuotas,
        desgloseCuotas,
        residuoAjustado: residuo,
        totalIngresos,
    };
}

/**
 * HU10 — Registro de gasto compartido
 */
export async function registrarGasto(
    datos: {
        viviendaId: string;
        concepto: string;
        monto: number;
        pagadorId: string;
        pagadorNombre?: string;
        participantes: string[];
        fecha: string;
        categoria?: string;
    },
    integrantesVivienda: User[]
): Promise<Expense> {
    const cleanConcepto = datos.concepto.trim();
    if (!cleanConcepto) {
        throw new Error('El concepto del gasto es obligatorio.');
    }

    const monto = Number(datos.monto);
    if (isNaN(monto) || monto <= 0) {
        throw new Error('El monto del gasto debe ser un número mayor a cero.');
    }

    if (!datos.pagadorId) {
        throw new Error('Debes seleccionar el integrante que realizó el pago.');
    }

    if (!datos.participantes || datos.participantes.length === 0) {
        throw new Error('Debes seleccionar al menos un participante para la distribución del gasto.');
    }

    // Filtrar los usuarios participantes
    const participantesUsers = integrantesVivienda.filter((u) =>
        datos.participantes.includes(u.id)
    );

    // Calcular la distribución proporcional exacta (HU11)
    const { cuotas, desgloseCuotas, residuoAjustado } = calcularDistribucionProporcional(
        monto,
        datos.pagadorId,
        participantesUsers
    );

    const gastoId = 'gasto-' + Date.now();
    const pagadorUser = integrantesVivienda.find((u) => u.id === datos.pagadorId);

    const nuevoGasto: Expense = {
        id: gastoId,
        viviendaId: datos.viviendaId,
        concepto: cleanConcepto,
        monto,
        pagadorId: datos.pagadorId,
        pagadorNombre: datos.pagadorNombre || pagadorUser?.nombre || 'Integrante',
        participantes: datos.participantes,
        fecha: datos.fecha || new Date().toISOString().split('T')[0],
        categoria: datos.categoria || 'Hogar',
        cuotas,
        desgloseCuotas,
        residuoAjustado,
        createdAt: new Date().toISOString(),
    };

    // 1. Guardar localmente
    const local = getLocalExpenses();
    local.unshift(nuevoGasto);
    saveLocalExpenses(local);

    // 2. Guardar en Firestore
    try {
        const gastoRef = doc(db, 'expenses', gastoId);
        await setDoc(gastoRef, nuevoGasto);
    } catch (err) {
        console.warn('Aviso: guardando gasto en almacenamiento local (Firestore no disponible):', err);
    }

    return nuevoGasto;
}

/**
 * HU12 — Consulta del historial de gastos de la vivienda
 */
export async function obtenerGastosPorVivienda(viviendaId: string): Promise<Expense[]> {
    if (!viviendaId) return [];

    // 1. Intentar consultar en Firestore
    try {
        const gastosRef = collection(db, 'expenses');
        const q = query(gastosRef, where('viviendaId', '==', viviendaId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const remoteGastos: Expense[] = [];
            snapshot.forEach((d) => {
                remoteGastos.push({ id: d.id, ...d.data() } as Expense);
            });
            // Ordenar cronológicamente descendente
            remoteGastos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            // Combinar con almacenamiento local
            const local = getLocalExpenses().filter((g) => g.viviendaId === viviendaId);
            const map = new Map<string, Expense>();
            remoteGastos.forEach((g) => map.set(g.id, g));
            local.forEach((g) => {
                if (!map.has(g.id)) map.set(g.id, g);
            });
            return Array.from(map.values()).sort(
                (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
            );
        }
    } catch (err) {
        console.warn('Aviso al obtener gastos de Firestore:', err);
    }

    // 2. Fallback local
    const local = getLocalExpenses().filter((g) => g.viviendaId === viviendaId);
    return local.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

/**
 * HU12 — Filtro avanzado de gastos
 */
export function filtrarGastos(
    gastos: Expense[],
    filtros: {
        busqueda?: string;
        fechaInicio?: string;
        fechaFin?: string;
        pagadorId?: string;
    }
): Expense[] {
    return gastos.filter((g) => {
        // Filtro por concepto o palabra clave
        if (filtros.busqueda && filtros.busqueda.trim() !== '') {
            const queryClean = filtros.busqueda.toLowerCase().trim();
            const matchConcepto = g.concepto.toLowerCase().includes(queryClean);
            const matchCategoria = (g.categoria || '').toLowerCase().includes(queryClean);
            const matchPagador = (g.pagadorNombre || '').toLowerCase().includes(queryClean);
            if (!matchConcepto && !matchCategoria && !matchPagador) {
                return false;
            }
        }

        // Filtro por fecha inicio
        if (filtros.fechaInicio && filtros.fechaInicio !== '') {
            if (g.fecha < filtros.fechaInicio) {
                return false;
            }
        }

        // Filtro por fecha fin
        if (filtros.fechaFin && filtros.fechaFin !== '') {
            if (g.fecha > filtros.fechaFin) {
                return false;
            }
        }

        // Filtro por pagador
        if (filtros.pagadorId && filtros.pagadorId !== 'todos') {
            if (g.pagadorId !== filtros.pagadorId) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Cálculo del saldo consolidado de cada integrante derivado de todos los gastos
 * 
 * Saldo = Suma(Lo que pagó de su bolsillo) - Suma(Las cuotas que le correspondían pagar)
 * Saldo > 0: Saldo a favor (la vivienda le debe)
 * Saldo < 0: Deuda (le debe a la vivienda)
 * Saldo == 0: Al día
 */
export function calcularSaldosConsolidados(
    gastos: Expense[],
    integrantes: User[]
): Record<string, number> {
    const saldos: Record<string, number> = {};

    integrantes.forEach((u) => {
        saldos[u.id] = 0;
    });

    gastos.forEach((g) => {
        // El pagador desembolsó el monto total
        if (saldos[g.pagadorId] === undefined) {
            saldos[g.pagadorId] = 0;
        }
        saldos[g.pagadorId] += g.monto;

        // A cada participante se le debita su cuota asignada
        Object.entries(g.cuotas).forEach(([userId, cuota]) => {
            if (saldos[userId] === undefined) {
                saldos[userId] = 0;
            }
            saldos[userId] -= cuota;
        });
    });

    return saldos;
}
