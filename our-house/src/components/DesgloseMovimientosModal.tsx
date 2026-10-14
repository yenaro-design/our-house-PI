import { useEffect, useMemo } from 'react';
import { Receipt, X } from 'lucide-react';
import type { Expense } from '../models/Expense';
import type { Debt, DebtPayment } from '../models/Debt';
import { calcularDesgloseDeuda, calcularDesgloseSaldo } from '../services/desgloseService';

export type ObjetivoDesglose = { tipo: 'saldo' } | { tipo: 'deuda'; deuda: Debt };

interface Props {
    objetivo: ObjetivoDesglose;
    expenses: Expense[]; // los mismos gastos que ya carga el Dashboard
    payments: DebtPayment[]; // los mismos pagos que ya carga el Dashboard
    userId: string;
    saldoMostrado: number; // el saldo consolidado que se ve en el Dashboard
    nombres?: Record<string, string>; // userId -> nombre, para mostrar quién pagó
    onClose: () => void;
}

const VERDE = '#15803d';
const ROJO = '#b91c1c';

const formatCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(valor);

const formatConSigno = (valor: number) =>
    valor > 0 ? `+${formatCOP(valor)}` : valor < 0 ? `-${formatCOP(Math.abs(valor))}` : formatCOP(0);

const colorDe = (valor: number) => (valor > 0 ? VERDE : valor < 0 ? ROJO : 'inherit');

const derecha = { textAlign: 'right' as const, whiteSpace: 'nowrap' as const };

/**
 * HU16 — Desglose de los movimientos que originaron una deuda o el saldo.
 * Recibe los datos del Dashboard (no consulta por su cuenta), así los valores
 * mostrados son siempre los registrados en el sistema (criterio 5) y el desglose
 * del saldo suma exactamente lo que muestra HU15 (criterio 4).
 */
export default function DesgloseMovimientosModal({
    objetivo,
    expenses,
    payments,
    userId,
    saldoMostrado,
    nombres,
    onClose,
}: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const desgloseSaldo = useMemo(
        () =>
            objetivo.tipo === 'saldo'
                ? calcularDesgloseSaldo(expenses, payments, userId, saldoMostrado, nombres)
                : null,
        [objetivo, expenses, payments, userId, saldoMostrado, nombres]
    );

    const desgloseDeuda = useMemo(
        () =>
            objetivo.tipo === 'deuda' ? calcularDesgloseDeuda(objetivo.deuda, payments, expenses) : null,
        [objetivo, payments, expenses]
    );

    const titulo =
        objetivo.tipo === 'saldo' ? 'Desglose de mi saldo consolidado' : 'Desglose de la deuda';

    return (
        <div className="dashboard-modal-backdrop" onClick={onClose}>
            <div
                className="dashboard-modal-card"
                style={{ maxWidth: 820 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="desglose-titulo"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="dashboard-modal-header">
                    <h3 id="desglose-titulo" className="dashboard-modal-title">
                        <Receipt size={20} color="var(--dashboard-green)" />
                        {titulo}
                    </h3>
                    <button
                        type="button"
                        className="dashboard-modal-close"
                        onClick={onClose}
                        aria-label="Cerrar desglose"
                    >
                        <X size={18} />
                    </button>
                </div>

                {desgloseSaldo && (
                    <>
                        <p style={{ margin: '0 0 4px' }}>Saldo consolidado actual</p>
                        <p
                            style={{
                                fontSize: '1.75rem',
                                fontWeight: 700,
                                margin: '0 0 8px',
                                color: colorDe(desgloseSaldo.saldoMostrado),
                            }}
                        >
                            {formatConSigno(desgloseSaldo.saldoMostrado)}
                        </p>
                        <p style={{ margin: '0 0 16px', fontSize: 13 }}>
                            En cada gasto se suma lo que pagaste y se resta la cuota que te correspondía; los
                            pagos entre integrantes suman si tú pagaste y restan si los recibiste. Al acumular
                            todos los movimientos obtienes tu saldo.
                        </p>

                        {desgloseSaldo.movimientos.length === 0 ? (
                            <p>Aún no hay movimientos que afecten tu saldo.</p>
                        ) : (
                            <div className="dashboard-table-container">
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Movimiento</th>
                                            <th style={derecha}>Valor total</th>
                                            <th style={derecha}>Efecto en tu saldo</th>
                                            <th style={derecha}>Acumulado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {desgloseSaldo.movimientos.map((m) => (
                                            <tr key={`${m.tipo}-${m.id}`}>
                                                <td>{m.fecha}</td>
                                                <td>
                                                    <strong>{m.titulo}</strong>
                                                    <div style={{ fontSize: 11, opacity: 0.75 }}>
                                                        {m.tipo === 'gasto' ? 'Gasto' : 'Pago'} · {m.detalle}
                                                    </div>
                                                </td>
                                                <td style={derecha}>{formatCOP(m.montoTotal)}</td>
                                                <td style={{ ...derecha, color: colorDe(m.efecto), fontWeight: 600 }}>
                                                    {formatConSigno(m.efecto)}
                                                </td>
                                                <td style={derecha}>{formatConSigno(m.acumulado)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3}>
                                                <strong>Suma de los movimientos</strong>
                                            </td>
                                            <td
                                                style={{ ...derecha, color: colorDe(desgloseSaldo.saldo) }}
                                                colSpan={2}
                                            >
                                                <strong>{formatConSigno(desgloseSaldo.saldo)}</strong>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        <p
                            role="status"
                            style={{ marginTop: 14, fontSize: 13, color: desgloseSaldo.coincide ? VERDE : ROJO }}
                        >
                            {desgloseSaldo.coincide
                                ? '✓ La suma de los movimientos coincide con tu saldo consolidado.'
                                : '⚠ La suma de los movimientos no coincide con tu saldo consolidado. Recarga la página; si persiste, avisa al equipo.'}
                        </p>
                    </>
                )}

                {desgloseDeuda && (
                    <>
                        <p style={{ margin: '0 0 4px' }}>
                            <strong>{desgloseDeuda.deuda.deudorNombre}</strong> le debe a{' '}
                            <strong>{desgloseDeuda.deuda.acreedorNombre}</strong>
                        </p>
                        <p
                            style={{
                                fontSize: '1.75rem',
                                fontWeight: 700,
                                margin: '0 0 8px',
                                color: desgloseDeuda.saldoCalculado > 0 ? ROJO : VERDE,
                            }}
                        >
                            {formatCOP(desgloseDeuda.saldoCalculado)}
                        </p>
                        <p style={{ margin: '0 0 16px', fontSize: 13 }}>
                            {desgloseDeuda.deuda.deudorId === userId
                                ? 'Esta cuota es parte de lo que se descuenta de tu saldo consolidado.'
                                : desgloseDeuda.deuda.acreedorId === userId
                                ? 'Este valor es parte de lo que pagaste por otros y se refleja a tu favor en tu saldo consolidado.'
                                : 'Detalle de una deuda entre otros integrantes de la vivienda.'}
                        </p>

                        <div className="dashboard-table-container">
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Movimiento</th>
                                        <th style={derecha}>Valor</th>
                                        <th style={derecha}>Saldo pendiente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {desgloseDeuda.movimientos.map((m, i) => (
                                        <tr key={`${m.tipo}-${i}`}>
                                            <td>{m.fecha}</td>
                                            <td>{m.descripcion}</td>
                                            <td
                                                style={{
                                                    ...derecha,
                                                    fontWeight: 600,
                                                    color: m.valor < 0 ? VERDE : ROJO,
                                                }}
                                            >
                                                {m.valor < 0
                                                    ? `-${formatCOP(Math.abs(m.valor))}`
                                                    : `+${formatCOP(m.valor)}`}
                                            </td>
                                            <td style={derecha}>{formatCOP(m.saldoTras)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2}>
                                            <strong>Cuota original {formatCOP(desgloseDeuda.montoOriginal)}</strong>
                                            {' − '}
                                            <strong>pagado {formatCOP(desgloseDeuda.totalPagado)}</strong>
                                        </td>
                                        <td style={derecha} colSpan={2}>
                                            <strong>Pendiente {formatCOP(desgloseDeuda.saldoCalculado)}</strong>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <p
                            role="status"
                            style={{ marginTop: 14, fontSize: 13, color: desgloseDeuda.coincide ? VERDE : ROJO }}
                        >
                            {desgloseDeuda.coincide
                                ? '✓ Los movimientos coinciden con lo registrado en la deuda y en el gasto de origen.'
                                : '⚠ Los movimientos no coinciden con lo registrado en la deuda. Recarga la página; si persiste, avisa al equipo.'}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
