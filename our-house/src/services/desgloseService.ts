import type { Expense } from '../models/Expense';
import type { Debt, DebtPayment } from '../models/Debt';

/**
 * HU16 — Consulta del desglose de movimientos que originaron cada deuda o saldo.
 *
 * No consulta nada por su cuenta: trabaja con los mismos gastos, deudas y pagos
 * que ya carga el Dashboard, así lo que se ve en el desglose es exactamente lo
 * que está registrado y no hay dos fuentes de datos distintas.
 */

const TOLERANCIA = 0.01; // mismo margen de redondeo que HU15 (saldoService)

const formatCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(valor);

// ---------------------------------------------------------------------------
// Desglose del saldo consolidado (HU15)
// ---------------------------------------------------------------------------

export interface MovimientoSaldo {
    tipo: 'gasto' | 'pago';
    id: string; // id del gasto o del pago
    fecha: string; // YYYY-MM-DD
    titulo: string; // concepto del gasto o "Pago a / de <nombre>"
    detalle: string; // cómo se compone el efecto (quién pagó, cuota, etc.)
    montoTotal: number; // valor completo del gasto o del pago
    efecto: number; // + a favor / - deuda, sobre el saldo del usuario
    acumulado: number; // saldo acumulado hasta este movimiento
}

export interface DesgloseSaldo {
    movimientos: MovimientoSaldo[];
    saldo: number; // suma de los efectos de los movimientos
    saldoMostrado: number; // el saldo consolidado que se ve en pantalla
    coincide: boolean; // el desglose suma exactamente el saldo mostrado
}

function compararTexto(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Reglas (las mismas de calcularSaldosConsolidados en expenseService):
 *   gasto: +monto si el usuario fue el pagador, -cuota que le correspondía
 *   pago:  +monto si el usuario pagó (reduce su deuda), -monto si lo recibió
 * La suma de todos los efectos es el saldo consolidado.
 */
export function calcularDesgloseSaldo(
    gastos: Expense[],
    pagos: DebtPayment[],
    userId: string,
    saldoMostrado: number,
    nombres: Record<string, string> = {}
): DesgloseSaldo {
    type Item = Omit<MovimientoSaldo, 'acumulado'> & { orden: number; creado: string };
    const items: Item[] = [];

    for (const g of gastos) {
        const pagoUsuario = g.pagadorId === userId ? g.monto : 0;
        const cuotaUsuario = g.cuotas?.[userId] ?? 0;
        // Misma regla que saldoService: cuenta si el usuario pagó o tenía cuota.
        if (pagoUsuario === 0 && cuotaUsuario <= 0) continue;

        const pagador = g.pagadorId === userId ? 'Tú' : g.pagadorNombre || nombres[g.pagadorId] || 'Integrante';
        const partes: string[] = [`Pagó: ${pagador}`];
        if (pagoUsuario > 0) partes.push(`aportaste ${formatCOP(pagoUsuario)}`);
        if (cuotaUsuario > 0) partes.push(`tu cuota ${formatCOP(cuotaUsuario)}`);

        items.push({
            tipo: 'gasto',
            id: g.id,
            fecha: g.fecha,
            titulo: g.concepto,
            detalle: partes.join(' · '),
            montoTotal: g.monto,
            efecto: pagoUsuario - cuotaUsuario,
            orden: 0, // un gasto va antes que un pago del mismo día
            creado: g.createdAt ?? '',
        });
    }

    for (const p of pagos) {
        if (p.pagadorId !== userId && p.receptorId !== userId) continue;
        const pague = p.pagadorId === userId;
        const otro = pague
            ? p.receptorNombre || nombres[p.receptorId] || 'Integrante'
            : p.pagadorNombre || nombres[p.pagadorId] || 'Integrante';

        items.push({
            tipo: 'pago',
            id: p.id,
            fecha: p.fecha,
            titulo: pague ? `Pago a ${otro}` : `Pago recibido de ${otro}`,
            detalle: `${p.tipo === 'total' ? 'Pago total' : 'Pago parcial'} de "${p.gastoConcepto}"`,
            montoTotal: p.monto,
            efecto: pague ? p.monto : -p.monto,
            orden: 1,
            creado: p.createdAt ?? '',
        });
    }

    items.sort(
        (a, b) =>
            compararTexto(a.fecha, b.fecha) ||
            a.orden - b.orden ||
            compararTexto(a.creado, b.creado) ||
            compararTexto(a.id, b.id)
    );

    let acumulado = 0;
    const movimientos: MovimientoSaldo[] = items.map((m) => {
        acumulado += m.efecto;
        return {
            tipo: m.tipo,
            id: m.id,
            fecha: m.fecha,
            titulo: m.titulo,
            detalle: m.detalle,
            montoTotal: m.montoTotal,
            efecto: m.efecto,
            acumulado,
        };
    });

    return {
        movimientos,
        saldo: acumulado,
        saldoMostrado,
        coincide: Math.abs(acumulado - saldoMostrado) < TOLERANCIA,
    };
}

// ---------------------------------------------------------------------------
// Desglose de una deuda puntual (HU17)
// ---------------------------------------------------------------------------

export interface MovimientoDeuda {
    tipo: 'cuota' | 'pago';
    fecha: string; // YYYY-MM-DD
    descripcion: string;
    valor: number; // + aumenta lo que se debe (cuota) / - lo reduce (pago)
    saldoTras: number; // saldo pendiente luego del movimiento
}

export interface DesgloseDeuda {
    deuda: Debt;
    movimientos: MovimientoDeuda[];
    montoOriginal: number;
    totalPagado: number;
    saldoCalculado: number; // montoOriginal - pagos
    coincide: boolean; // lo calculado coincide con lo almacenado en la deuda y el gasto
}

export function calcularDesgloseDeuda(
    deuda: Debt,
    pagos: DebtPayment[],
    gastos: Expense[]
): DesgloseDeuda {
    const gasto = gastos.find((g) => g.id === deuda.gastoId);

    const pagosDeLaDeuda = pagos
        .filter((p) => p.deudaId === deuda.id)
        .sort((a, b) =>
            a.fecha !== b.fecha
                ? a.fecha < b.fecha
                    ? -1
                    : 1
                : a.createdAt < b.createdAt
                ? -1
                : a.createdAt > b.createdAt
                ? 1
                : 0
        );

    const movimientos: MovimientoDeuda[] = [];
    let saldo = deuda.montoOriginal;

    movimientos.push({
        tipo: 'cuota',
        fecha: deuda.gastoFecha,
        descripcion: `Cuota de ${deuda.deudorNombre} en "${deuda.gastoConcepto}" (pagó ${deuda.acreedorNombre})`,
        valor: deuda.montoOriginal,
        saldoTras: saldo,
    });

    let totalPagado = 0;
    for (const p of pagosDeLaDeuda) {
        saldo -= p.monto;
        totalPagado += p.monto;
        movimientos.push({
            tipo: 'pago',
            fecha: p.fecha,
            descripcion: `${p.tipo === 'total' ? 'Pago total' : 'Pago parcial'} de ${p.pagadorNombre} a ${p.receptorNombre}${
                p.nota ? ` — ${p.nota}` : ''
            }`,
            valor: -p.monto,
            saldoTras: saldo,
        });
    }

    const cuotaEnGasto = gasto ? gasto.cuotas?.[deuda.deudorId] : undefined;
    const coincideConGasto =
        cuotaEnGasto === undefined || Math.abs(cuotaEnGasto - deuda.montoOriginal) < TOLERANCIA;

    const coincide =
        coincideConGasto &&
        Math.abs(saldo - deuda.saldoPendiente) < TOLERANCIA &&
        Math.abs(totalPagado - deuda.montoPagado) < TOLERANCIA;

    return {
        deuda,
        movimientos,
        montoOriginal: deuda.montoOriginal,
        totalPagado,
        saldoCalculado: saldo,
        coincide,
    };
}
