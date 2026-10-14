import type { Expense } from '../models/Expense';
import type { DebtPayment } from '../models/Debt';
import type { User } from '../models/User';
import { calcularSaldosConsolidados, obtenerGastosPorVivienda } from './expenseService';
import { obtenerPagosPorVivienda } from './debtService';

/**
 * HU15 — Consulta de saldo consolidado individual.
 *
 * Reutiliza calcularSaldosConsolidados (expenseService) para no tener dos
 * cálculos distintos del saldo:
 *   Saldo = Suma(lo que pagó) - Suma(las cuotas que le correspondían)
 *           + pagos que realizó a otros integrantes - pagos que recibió (HU17)
 *   Saldo > 0 -> valor a favor | Saldo < 0 -> deuda pendiente | 0 -> al día
 */
export interface ResumenSaldo {
    saldo: number;          // consolidado (+ a favor, - deuda)
    deudaPendiente: number; // >= 0, lo que el usuario debe
    valorAFavor: number;    // >= 0, lo que le deben al usuario
    totalPagado: number;    // gastos que pagó de su bolsillo
    totalCuotas: number;    // cuotas que le correspondían
    pagosRealizados: number; // abonos/pagos de deudas que el usuario hizo (HU17)
    pagosRecibidos: number;  // abonos/pagos que otros le hicieron a él (HU17)
    cantidadGastos: number; // gastos en los que interviene (como pagador o participante)
    estado: 'deuda' | 'favor' | 'al-dia';
}

export function calcularResumenSaldo(
    gastos: Expense[],
    userId: string,
    pagos: DebtPayment[] = []
): ResumenSaldo {
    // Se siembra al usuario para que sus pagos cuenten aunque no tenga gastos.
    // El Dashboard calcula su saldo con esta misma función y los mismos pagos,
    // así ambas tarjetas muestran siempre la misma cifra.
    const yo: User = { id: userId, nombre: '', email: '', ingresoMensual: 0 };
    const saldos = calcularSaldosConsolidados(gastos, [yo], pagos);
    const saldo = saldos[userId] ?? 0;

    const pagosRealizados = pagos
        .filter((p) => p.pagadorId === userId)
        .reduce((acc, p) => acc + p.monto, 0);
    const pagosRecibidos = pagos
        .filter((p) => p.receptorId === userId)
        .reduce((acc, p) => acc + p.monto, 0);

    let totalPagado = 0;
    let totalCuotas = 0;
    let cantidadGastos = 0;

    for (const g of gastos) {
        const cuota = g.cuotas?.[userId] ?? 0;
        const pago = g.pagadorId === userId ? g.monto : 0;
        if (pago > 0 || cuota > 0) cantidadGastos += 1;
        totalPagado += pago;
        totalCuotas += cuota;
    }

    // Tolerancia de 1 peso por redondeo, igual que HU08/HU09 (0.01)
    const estado = saldo > 0.01 ? 'favor' : saldo < -0.01 ? 'deuda' : 'al-dia';

    return {
        saldo,
        deudaPendiente: saldo < 0 ? -saldo : 0,
        valorAFavor: saldo > 0 ? saldo : 0,
        totalPagado,
        totalCuotas,
        pagosRealizados,
        pagosRecibidos,
        cantidadGastos,
        estado,
    };
}

export async function obtenerResumenSaldo(
    viviendaId: string,
    userId: string
): Promise<ResumenSaldo> {
    const [gastos, pagos] = await Promise.all([
        obtenerGastosPorVivienda(viviendaId),
        obtenerPagosPorVivienda(viviendaId),
    ]);
    return calcularResumenSaldo(gastos, userId, pagos);
}
