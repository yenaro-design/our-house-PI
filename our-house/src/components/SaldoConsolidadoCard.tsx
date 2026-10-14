import { useMemo } from 'react';
import type { Expense } from '../models/Expense';
import type { DebtPayment } from '../models/Debt';
import { calcularResumenSaldo, type ResumenSaldo } from '../services/saldoService';

interface Props {
    expenses: Expense[]; // los mismos gastos que ya carga el Dashboard
    payments?: DebtPayment[]; // los mismos pagos de deudas que ya carga el Dashboard
    userId: string;
    onVerDesglose?: () => void; // HU16: abre el desglose de movimientos del saldo
}

const formatCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(valor);

const MENSAJE_ESTADO: Record<ResumenSaldo['estado'], string> = {
    deuda: 'Tienes deudas pendientes en la vivienda.',
    favor: 'Tienes un valor a favor en la vivienda.',
    'al-dia': 'Estás al día con la vivienda.',
};

/**
 * HU15 — Saldo consolidado individual.
 * No consulta datos por su cuenta: recibe los gastos del Dashboard, así se
 * actualiza solo cuando se registra, edita o elimina un gasto (criterio 5)
 * y nunca muestra una cifra distinta a la del resto de la pantalla.
 */
export default function SaldoConsolidadoCard({ expenses, payments = [], userId, onVerDesglose }: Props) {
    const resumen = useMemo(
        () => calcularResumenSaldo(expenses, userId, payments),
        [expenses, payments, userId]
    );

    const color =
        resumen.estado === 'deuda' ? '#b91c1c' : resumen.estado === 'favor' ? '#15803d' : 'inherit';

    return (
        <section aria-labelledby="saldo-titulo" className="saldo-consolidado-card">
            <h3 id="saldo-titulo">Mi saldo consolidado</h3>

            <p style={{ fontSize: '1.75rem', fontWeight: 700, color, margin: '0.25rem 0' }}>
                {resumen.saldo < 0 ? '-' : ''}
                {formatCOP(Math.abs(resumen.saldo))}
            </p>
            <p>{MENSAJE_ESTADO[resumen.estado]}</p>

            <dl>
                <dt>Deudas pendientes</dt>
                <dd>{formatCOP(resumen.deudaPendiente)}</dd>

                <dt>Valores a favor</dt>
                <dd>{formatCOP(resumen.valorAFavor)}</dd>

                <dt>Total que pagaste</dt>
                <dd>{formatCOP(resumen.totalPagado)}</dd>

                <dt>Total de tus cuotas</dt>
                <dd>{formatCOP(resumen.totalCuotas)}</dd>

                <dt>Pagos que realizaste</dt>
                <dd>{formatCOP(resumen.pagosRealizados)}</dd>

                <dt>Pagos que recibiste</dt>
                <dd>{formatCOP(resumen.pagosRecibidos)}</dd>
            </dl>

            <small>Calculado con {resumen.cantidadGastos} gasto(s) registrados.</small>

            {onVerDesglose && (
                <div style={{ marginTop: '0.75rem' }}>
                    <button type="button" onClick={onVerDesglose}>
                        Ver desglose de movimientos
                    </button>
                </div>
            )}
        </section>
    );
}
