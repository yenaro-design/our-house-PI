import type { Expense } from '../models/Expense';
import { calcularSaldosConsolidados, obtenerGastosPorVivienda } from './expenseService';

/**
 * HU15 — Consulta de saldo consolidado individual.
 *
 * Reutiliza calcularSaldosConsolidados (expenseService) para no tener dos
 * cálculos distintos del saldo:
 *   Saldo = Suma(lo que pagó) - Suma(las cuotas que le correspondían)
 *   Saldo > 0 -> valor a favor | Saldo < 0 -> deuda pendiente | 0 -> al día
 */
export interface ResumenSaldo {
    saldo: number;          // consolidado (+ a favor, - deuda)
    deudaPendiente: number; // >= 0, lo que el usuario debe
    valorAFavor: number;    // >= 0, lo que le deben al usuario
    totalPagado: number;    // gastos que pagó de su bolsillo
    totalCuotas: number;    // cuotas que le correspondían
    cantidadGastos: number; // gastos en los que interviene (como pagador o participante)
    estado: 'deuda' | 'favor' | 'al-dia';
}

export function calcularResumenSaldo(gastos: Expense[], userId: string): ResumenSaldo {
    const saldos = calcularSaldosConsolidados(gastos, []);
    const saldo = saldos[userId] ?? 0;

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
        cantidadGastos,
        estado,
    };
}

export async function obtenerResumenSaldo(
    viviendaId: string,
    userId: string
): Promise<ResumenSaldo> {
    const gastos = await obtenerGastosPorVivienda(viviendaId);
    return calcularResumenSaldo(gastos, userId);
}
