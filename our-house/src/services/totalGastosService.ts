import type { Expense } from '../models/Expense';

export interface ResumenGastosPeriodo {
    total: number;
    cantidad: number;
}

/**
 * ------------------------------------------------------------------------
 * Devuelve el mes de hoy en formato YYYY-MM
 * ------------------------------------------------------------------------
 */
export function periodoActual(): string {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}`;
}

/**
 * ------------------------------------------------------------------------
 * Suma los gastos cuya fecha cae en el periodo (YYYY-MM)
 * Las fechas de los gastos vienen como YYYY-MM-DD
 * ------------------------------------------------------------------------
 */
export function calcularTotalGastosPeriodo(
    expenses: Expense[],
    periodo: string
): ResumenGastosPeriodo {
    const delPeriodo = expenses.filter((gasto) => (gasto.fecha ?? '').startsWith(periodo));
    const total = delPeriodo.reduce((suma, gasto) => suma + gasto.monto, 0);

    return { total, cantidad: delPeriodo.length };
}