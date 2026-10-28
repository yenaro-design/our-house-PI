import { useMemo, useState } from 'react';
import { CalendarDays, Receipt } from 'lucide-react';
import type { Expense } from '../models/Expense';
import { calcularTotalGastosPeriodo, periodoActual } from '../services/totalGastosService';

interface Props {
    expenses: Expense[];
}

const formatCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(valor);

/**
 * ------------------------------------------------------------------------
 * HU23 - Resumen del total de gastos del periodo
 * No consulta datos por su cuenta, usa los gastos que ya carga el Dashboard
 * así el total cambia solo cuando se registra, edita o elimina un gasto
 * ------------------------------------------------------------------------
 */
export default function TotalGastosCard({ expenses }: Props) {
    const [periodo, setPeriodo] = useState(periodoActual());

    const resumen = useMemo(
        () => calcularTotalGastosPeriodo(expenses, periodo),
        [expenses, periodo]
    );

    return (
        <section aria-labelledby="total-gastos-titulo" className="saldo-consolidado-card">
            <div className="saldo-consolidado-card-header">
                <div>
                    <span className="saldo-consolidado-card-kicker">Resumen de la vivienda</span>
                    <h3 id="total-gastos-titulo">Total de gastos del periodo</h3>
                </div>
                <span className="saldo-consolidado-card-icon" aria-hidden="true"><Receipt size={19} /></span>
            </div>

            <div className="saldo-consolidado-card-hero">
                <span className="saldo-consolidado-card-label">Gastos registrados</span>
                <strong>{formatCOP(resumen.total)}</strong>
            </div>

            <div className="saldo-consolidado-card-footer">
                <small>
                    {resumen.cantidad} {resumen.cantidad === 1 ? 'gasto registrado' : 'gastos registrados'} en el periodo.
                </small>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CalendarDays size={15} aria-hidden="true" />
                    <input
                        type="month"
                        value={periodo}
                        onChange={(e) => e.target.value && setPeriodo(e.target.value)}
                        aria-label="Periodo"
                    />
                </label>
            </div>
        </section>
    );
}