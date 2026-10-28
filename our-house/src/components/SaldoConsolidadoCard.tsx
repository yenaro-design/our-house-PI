import { useMemo } from 'react';
import { ArrowUpRight, CheckCircle2, ChevronDown, HandCoins, Receipt, WalletCards } from 'lucide-react';
import type { Expense } from '../models/Expense';
import type { Debt, DebtPayment } from '../models/Debt';
import { calcularDetalleDeudas, calcularResumenSaldo, type ResumenSaldo } from '../services/saldoService';

interface Props {
    expenses: Expense[]; // los mismos gastos que ya carga el Dashboard
    payments?: DebtPayment[]; // los mismos pagos de deudas que ya carga el Dashboard
    debts?: Debt[]; // HU24: las mismas deudas que ya carga el Dashboard, para el detalle por persona
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
export default function SaldoConsolidadoCard({ expenses, payments = [], debts = [], userId, onVerDesglose }: Props) {
    const resumen = useMemo(
        () => calcularResumenSaldo(expenses, userId, payments),
        [expenses, payments, userId]
    );

    // HU24: detalle de a quién le debo y quién me debe, con las deudas del Dashboard
    const detalle = useMemo(() => calcularDetalleDeudas(debts, userId), [debts, userId]);
    const hayDetalle = detalle.debo.length > 0 || detalle.meDeben.length > 0;

    const estadoClase = `saldo-consolidado-card-${resumen.estado}`;
    const iconoEstado =
        resumen.estado === 'deuda' ? <ArrowUpRight size={16} /> :
        resumen.estado === 'favor' ? <HandCoins size={16} /> :
        <CheckCircle2 size={16} />;

    return (
        <section aria-labelledby="saldo-titulo" className={`saldo-consolidado-card ${estadoClase}`}>
            <div className="saldo-consolidado-card-header">
                <div>
                    <span className="saldo-consolidado-card-kicker">Resumen personal</span>
                    <h3 id="saldo-titulo">Mi saldo consolidado</h3>
                </div>
                <span className="saldo-consolidado-card-icon" aria-hidden="true"><WalletCards size={19} /></span>
            </div>

            <div className="saldo-consolidado-card-hero">
                <span className="saldo-consolidado-card-label">Saldo actual</span>
                <strong>
                    {resumen.saldo < 0 ? '-' : ''}
                    {formatCOP(Math.abs(resumen.saldo))}
                </strong>
                <span className="saldo-consolidado-card-status">{iconoEstado}{MENSAJE_ESTADO[resumen.estado]}</span>
            </div>

            <div className="saldo-consolidado-card-balance-grid">
                <div className="saldo-consolidado-card-balance saldo-consolidado-card-balance-debt">
                    <span><Receipt size={15} /> Deudas pendientes</span>
                    <strong>{formatCOP(resumen.deudaPendiente)}</strong>
                </div>
                <div className="saldo-consolidado-card-balance saldo-consolidado-card-balance-credit">
                    <span><HandCoins size={15} /> Valores a favor</span>
                    <strong>{formatCOP(resumen.valorAFavor)}</strong>
                </div>
            </div>

            <details className="saldo-consolidado-card-dropdown">
                <summary>
                    <span>Ver detalle de pagos y cuotas</span>
                    <ChevronDown size={16} aria-hidden="true" />
                </summary>
                <dl className="saldo-consolidado-card-details">
                    <div><dt>Total que pagaste</dt><dd>{formatCOP(resumen.totalPagado)}</dd></div>
                    <div><dt>Total de tus cuotas</dt><dd>{formatCOP(resumen.totalCuotas)}</dd></div>
                    <div><dt>Pagos que realizaste</dt><dd>{formatCOP(resumen.pagosRealizados)}</dd></div>
                    <div><dt>Pagos que recibiste</dt><dd>{formatCOP(resumen.pagosRecibidos)}</dd></div>
                </dl>
            </details>
                        {hayDetalle && (
                <details className="saldo-consolidado-card-dropdown">
                    <summary>
                        <span>Ver deudas y valores a favor por persona</span>
                        <ChevronDown size={16} aria-hidden="true" />
                    </summary>
                    <dl className="saldo-consolidado-card-details">
                        {detalle.debo.map((p) => (
                            <div key={`debo-${p.personaId}`}><dt>Le debes a {p.nombre}</dt><dd>{formatCOP(p.monto)}</dd></div>
                        ))}
                        {detalle.meDeben.map((p) => (
                            <div key={`me-deben-${p.personaId}`}><dt>{p.nombre} te debe</dt><dd>{formatCOP(p.monto)}</dd></div>
                        ))}
                    </dl>
                </details>
            )}

            <div className="saldo-consolidado-card-footer">
                <small>Calculado con {resumen.cantidadGastos} {resumen.cantidadGastos === 1 ? 'gasto registrado' : 'gastos registrados'}.</small>
                {onVerDesglose && (
                    <button type="button" className="saldo-consolidado-card-action" onClick={onVerDesglose}>
                        Ver movimientos <ArrowUpRight size={15} />
                    </button>
                )}
            </div>
        </section>
    );
}
