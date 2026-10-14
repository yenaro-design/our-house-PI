import {
    collection,
    doc,
    getDocs,
    query,
    setDoc,
    where,
} from 'firebase/firestore';
import { db, isFirebasePersistenceAvailable } from '../firebase/config';
import type { Debt, DebtPayment, DebtStatus, PaymentType } from '../models/Debt';
import type { Expense } from '../models/Expense';
import type { User } from '../models/User';

const DEBTS_STORAGE_KEY = 'our_house_debts';
const PAYMENTS_STORAGE_KEY = 'our_house_debt_payments';

function getLocalDebts(): Debt[] {
    try {
        const raw = localStorage.getItem(DEBTS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Error al leer deudas locales:', e);
    }
    return [];
}

function saveLocalDebts(debts: Debt[]) {
    try {
        localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(debts));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('our_house:debts_change'));
        }
    } catch (e) {
        console.warn('Error al guardar deudas locales:', e);
    }
}

function getLocalPayments(): DebtPayment[] {
    try {
        const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Error al leer pagos locales:', e);
    }
    return [];
}

function saveLocalPayments(payments: DebtPayment[]) {
    try {
        localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('our_house:payments_change'));
        }
    } catch (e) {
        console.warn('Error al guardar pagos locales:', e);
    }
}

/**
 * Sincroniza las deudas derivadas de los gastos compartidos de una vivienda.
 * Cada cuota asignada a un participante distinto del pagador genera una obligación.
 */
export async function sincronizarDeudasDesdeGastos(
    viviendaId: string,
    gastos: Expense[],
    integrantes: User[]
): Promise<Debt[]> {
    if (!viviendaId) return [];

    const existingDebts = getLocalDebts().filter((d) => d.viviendaId === viviendaId);
    const debtsMap = new Map<string, Debt>();
    existingDebts.forEach((d) => debtsMap.set(d.id, d));

    const userNames = new Map<string, string>();
    integrantes.forEach((u) => userNames.set(u.id, u.nombre));

    gastos.forEach((gasto) => {
        const pagadorNombre =
            gasto.pagadorNombre || userNames.get(gasto.pagadorId) || 'Integrante';

        Object.entries(gasto.cuotas || {}).forEach(([deudorId, cuota]) => {
            if (deudorId === gasto.pagadorId || cuota <= 0) {
                return;
            }

            const debtId = `deuda-${gasto.id}-${deudorId}`;
            const deudorNombre = userNames.get(deudorId) || 'Integrante';

            const current = debtsMap.get(debtId);
            if (current) {
                // Conservar montoPagado actual y recalcular saldo con el montoOriginal vigente
                const montoPagado = current.montoPagado || 0;
                const saldoPendiente = Math.max(0, cuota - montoPagado);
                const estado: DebtStatus =
                    saldoPendiente === 0
                        ? 'liquidada'
                        : montoPagado > 0
                        ? 'parcial'
                        : 'pendiente';

                debtsMap.set(debtId, {
                    ...current,
                    gastoConcepto: gasto.concepto,
                    gastoFecha: gasto.fecha,
                    deudorNombre,
                    acreedorNombre: pagadorNombre,
                    montoOriginal: cuota,
                    saldoPendiente,
                    estado,
                });
            } else {
                debtsMap.set(debtId, {
                    id: debtId,
                    gastoId: gasto.id,
                    gastoConcepto: gasto.concepto,
                    gastoFecha: gasto.fecha,
                    viviendaId,
                    deudorId,
                    deudorNombre,
                    acreedorId: gasto.pagadorId,
                    acreedorNombre: pagadorNombre,
                    montoOriginal: cuota,
                    montoPagado: 0,
                    saldoPendiente: cuota,
                    estado: 'pendiente',
                    fechaCreacion: gasto.fecha || new Date().toISOString().split('T')[0],
                });
            }
        });
    });

    const synchronized = Array.from(debtsMap.values()).sort((a, b) => {
        // Primero las pendientes/parciales, luego las liquidadas
        if (a.estado === 'liquidada' && b.estado !== 'liquidada') return 1;
        if (a.estado !== 'liquidada' && b.estado === 'liquidada') return -1;
        return new Date(b.gastoFecha).getTime() - new Date(a.gastoFecha).getTime();
    });

    // Guardar en local storage
    const otherDebts = getLocalDebts().filter((d) => d.viviendaId !== viviendaId);
    saveLocalDebts([...otherDebts, ...synchronized]);

    return synchronized;
}

/**
 * Obtener deudas de una vivienda
 */
export async function obtenerDeudasPorVivienda(
    viviendaId: string,
    gastos?: Expense[],
    integrantes?: User[]
): Promise<Debt[]> {
    if (!viviendaId) return [];

    if (gastos && integrantes) {
        return sincronizarDeudasDesdeGastos(viviendaId, gastos, integrantes);
    }

    // Consultar Firestore
    try {
        const debtsRef = collection(db, 'debts');
        const q = query(debtsRef, where('viviendaId', '==', viviendaId));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const remote: Debt[] = [];
            snap.forEach((d) => remote.push(d.data() as Debt));
            const local = getLocalDebts().filter((d) => d.viviendaId === viviendaId);
            const map = new Map<string, Debt>();
            remote.forEach((d) => map.set(d.id, d));
            local.forEach((d) => {
                if (!map.has(d.id)) map.set(d.id, d);
            });
            return Array.from(map.values());
        }
    } catch (e) {
        console.warn('Aviso al consultar deudas en Firestore:', e);
    }

    return getLocalDebts().filter((d) => d.viviendaId === viviendaId);
}

/**
 * Obtener transacciones de pago de una vivienda
 */
export async function obtenerPagosPorVivienda(viviendaId: string): Promise<DebtPayment[]> {
    if (!viviendaId) return [];

    try {
        const paymentsRef = collection(db, 'debt_payments');
        const q = query(paymentsRef, where('viviendaId', '==', viviendaId));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const remote: DebtPayment[] = [];
            snap.forEach((d) => remote.push(d.data() as DebtPayment));
            const local = getLocalPayments().filter((p) => p.viviendaId === viviendaId);
            const map = new Map<string, DebtPayment>();
            remote.forEach((p) => map.set(p.id, p));
            local.forEach((p) => {
                if (!map.has(p.id)) map.set(p.id, p);
            });
            return Array.from(map.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
    } catch (e) {
        console.warn('Aviso al consultar pagos en Firestore:', e);
    }

    return getLocalPayments()
        .filter((p) => p.viviendaId === viviendaId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Obtener transacciones de pago asociadas a una deuda específica
 */
export async function obtenerPagosPorDeuda(deudaId: string): Promise<DebtPayment[]> {
    const all = getLocalPayments();
    return all
        .filter((p) => p.deudaId === deudaId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Criterios de Aceptación:
 * 1. El sistema permite seleccionar una deuda pendiente y registrar una transacción de pago.
 * 2. El usuario puede definir si la transacción corresponde a un pago parcial o total.
 * 3. El sistema impide ingresar un valor de pago superior al monto total adeudado.
 * 4. El pago queda enlazado explícitamente a la deuda, al usuario pagador y al usuario receptor.
 * 5. El saldo adeudado se descuenta automáticamente tras confirmarse la transacción.
 * 6. Al cubrir la totalidad del monto, la deuda cambia su estado a liquidada.
 */
export async function registrarPagoDeuda(datos: {
    deudaId: string;
    monto: number;
    tipo: PaymentType;
    fecha?: string;
    nota?: string;
}): Promise<{ pago: DebtPayment; deudaActualizada: Debt }> {
    const debts = getLocalDebts();
    const deudaIndex = debts.findIndex((d) => d.id === datos.deudaId);

    if (deudaIndex === -1) {
        throw new Error('La deuda seleccionada no existe o no fue encontrada.');
    }

    const deuda = debts[deudaIndex];

    if (deuda.estado === 'liquidada' || deuda.saldoPendiente <= 0) {
        throw new Error('Esta deuda ya se encuentra completamente liquidada.');
    }

    const montoPago = Math.round(Number(datos.monto));

    if (isNaN(montoPago) || montoPago <= 0) {
        throw new Error('El valor del pago debe ser un número entero mayor a cero ($COP).');
    }

    // Criterio 3: El sistema impide ingresar un valor de pago superior al monto total adeudado.
    if (montoPago > deuda.saldoPendiente) {
        const montoMaximoFormato = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(deuda.saldoPendiente);
        const montoIngresadoFormato = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(montoPago);

        throw new Error(
            `El valor ingresado (${montoIngresadoFormato}) supera el saldo pendiente de la deuda (${montoMaximoFormato}). No se permite pagar más del saldo adeudado.`
        );
    }

    // Criterio 2: Si el usuario seleccionó pago total, validar o asegurar que cubra exactamente el saldo pendiente
    if (datos.tipo === 'total' && montoPago !== deuda.saldoPendiente) {
        throw new Error(
            `Para un pago total, el valor debe coincidir exactamente con el saldo pendiente (${new Intl.NumberFormat(
                'es-CO',
                { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }
            ).format(deuda.saldoPendiente)}).`
        );
    }

    // Criterio 4: El pago queda enlazado explícitamente a la deuda, al usuario pagador y al usuario receptor.
    const pagoId = 'pago-' + Date.now();
    const fechaPago = datos.fecha || new Date().toISOString().split('T')[0];

    const nuevoPago: DebtPayment = {
        id: pagoId,
        deudaId: deuda.id,
        gastoId: deuda.gastoId,
        gastoConcepto: deuda.gastoConcepto,
        viviendaId: deuda.viviendaId,
        pagadorId: deuda.deudorId,
        pagadorNombre: deuda.deudorNombre,
        receptorId: deuda.acreedorId,
        receptorNombre: deuda.acreedorNombre,
        monto: montoPago,
        tipo: datos.tipo,
        fecha: fechaPago,
        nota: datos.nota?.trim() || '',
        createdAt: new Date().toISOString(),
    };

    // Criterio 5: El saldo adeudado se descuenta automáticamente tras confirmarse la transacción.
    const nuevoMontoPagado = deuda.montoPagado + montoPago;
    const nuevoSaldoPendiente = Math.max(0, deuda.montoOriginal - nuevoMontoPagado);

    // Criterio 6: Al cubrir la totalidad del monto, la deuda cambia su estado a liquidada.
    const nuevoEstado: DebtStatus = nuevoSaldoPendiente === 0 ? 'liquidada' : 'parcial';

    const deudaActualizada: Debt = {
        ...deuda,
        montoPagado: nuevoMontoPagado,
        saldoPendiente: nuevoSaldoPendiente,
        estado: nuevoEstado,
        fechaLiquidacion: nuevoEstado === 'liquidada' ? new Date().toISOString() : deuda.fechaLiquidacion,
    };

    // Persistir pago y deuda en almacenamiento local
    const payments = getLocalPayments();
    payments.unshift(nuevoPago);
    saveLocalPayments(payments);

    debts[deudaIndex] = deudaActualizada;
    saveLocalDebts(debts);

    // Persistir en Firestore si la conexión está disponible
    if (isFirebasePersistenceAvailable()) {
        try {
            const paymentRef = doc(db, 'debt_payments', pagoId);
            await setDoc(paymentRef, nuevoPago);

            const debtRef = doc(db, 'debts', deuda.id);
            await setDoc(debtRef, deudaActualizada);
        } catch (err) {
            console.warn('Aviso al persistir pago o actualizar deuda en Firestore:', err);
        }
    }

    return { pago: nuevoPago, deudaActualizada };
}
