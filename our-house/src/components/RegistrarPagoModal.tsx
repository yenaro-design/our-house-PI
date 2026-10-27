import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    DollarSign,
    X,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Loader2,
    Check,
} from 'lucide-react';
import type { Debt, PaymentType } from '../models/Debt';
import { registrarPagoDeuda } from '../services/debtService';

interface RegistrarPagoModalProps {
    deuda: Debt | null;
    deudasDisponibles?: Debt[];
    onClose: () => void;
    onPaymentSuccess: () => void;
}

function RegistrarPagoModal({
    deuda,
    deudasDisponibles = [],
    onClose,
    onPaymentSuccess,
}: RegistrarPagoModalProps) {
    const [selectedDeudaId, setSelectedDeudaId] = useState<string>(deuda?.id || '');
    const activeDebt =
        deudasDisponibles.find((d) => d.id === selectedDeudaId) || deuda;

    const [tipoPago, setTipoPago] = useState<PaymentType>('total');
    const [montoInput, setMontoInput] = useState<string>(() =>
        activeDebt ? String(activeDebt.saldoPendiente) : ''
    );
    const [fechaPago, setFechaPago] = useState<string>(
        () => new Date().toISOString().split('T')[0]
    );
    const [nota, setNota] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [exito, setExito] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');

    const formatCOP = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(val);
    };

    const handleSelectDebtChange = (newDebtId: string) => {
        setSelectedDeudaId(newDebtId);
        const target = deudasDisponibles.find((d) => d.id === newDebtId);
        if (target) {
            setMontoInput(
                tipoPago === 'total'
                    ? String(target.saldoPendiente)
                    : String(Math.min(target.saldoPendiente, Math.round(target.saldoPendiente / 2)))
            );
        }
        setError(null);
    };

    const handleTipoChange = (nuevoTipo: PaymentType) => {
        setTipoPago(nuevoTipo);
        setError(null);
        if (!activeDebt) return;
        if (nuevoTipo === 'total') {
            setMontoInput(String(activeDebt.saldoPendiente));
        } else {
            setMontoInput(
                String(Math.min(activeDebt.saldoPendiente, Math.round(activeDebt.saldoPendiente / 2)))
            );
        }
    };

    const handleMontoChange = (val: string) => {
        setMontoInput(val);
        setError(null);
        if (!activeDebt) return;

        const num = Number(val);
        // Criterio 3: El sistema impide ingresar un valor de pago superior al monto total adeudado
        if (num > activeDebt.saldoPendiente) {
            setError(
                `El monto no puede superar el saldo pendiente de ${formatCOP(
                    activeDebt.saldoPendiente
                )}.`
            );
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!activeDebt) {
            setError('Debes seleccionar una deuda pendiente válida.');
            return;
        }

        const monto = Math.round(Number(montoInput));
        if (isNaN(monto) || monto <= 0) {
            setError('Ingresa un monto de pago válido mayor a cero.');
            return;
        }

        // Criterio 3: El sistema impide ingresar un valor de pago superior al monto total adeudado
        if (monto > activeDebt.saldoPendiente) {
            setError(
                `El valor ingresado (${formatCOP(
                    monto
                )}) supera el saldo adeudado (${formatCOP(
                    activeDebt.saldoPendiente
                )}). Ajusta el valor del pago.`
            );
            return;
        }

        if (tipoPago === 'total' && monto !== activeDebt.saldoPendiente) {
            setError(
                `Para un pago total, el monto debe ser exactamente ${formatCOP(
                    activeDebt.saldoPendiente
                )}.`
            );
            return;
        }

        try {
            setGuardando(true);
            const { deudaActualizada } = await registrarPagoDeuda({
                deudaId: activeDebt.id,
                monto,
                tipo: tipoPago,
                fecha: fechaPago,
                nota: nota.trim(),
            });

            const fueLiquidada = deudaActualizada.estado === 'liquidada';
            const feedback = fueLiquidada
                ? `¡Pago total de ${formatCOP(monto)} confirmado! La deuda con ${activeDebt.acreedorNombre} ha quedado completamente liquidada.`
                : `Pago parcial de ${formatCOP(monto)} registrado. El nuevo saldo adeudado es de ${formatCOP(deudaActualizada.saldoPendiente)}.`;

            setMensajeExito(feedback);
            setExito(true);
            onPaymentSuccess();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al registrar el pago de la deuda.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="dashboard-modal-backdrop" onClick={onClose}>
            <div
                className="dashboard-modal-card"
                style={{ maxWidth: '520px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="dashboard-modal-header">
                    <h3 className="dashboard-modal-title">
                        <DollarSign size={20} color="var(--dashboard-green)" />
                        Registro de Pago de Deuda
                    </h3>
                    <button
                        type="button"
                        className="dashboard-modal-close"
                        onClick={onClose}
                        aria-label="Cerrar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {exito ? (
                    <div style={{ textAlign: 'center', padding: '20px 8px' }}>
                        <CheckCircle2
                            size={48}
                            color="#15803d"
                            style={{ margin: '0 auto 14px' }}
                        />
                        <h4 style={{ margin: '0 0 8px', fontSize: '18px', color: '#166534' }}>
                            Transacción confirmada
                        </h4>
                        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#374151' }}>
                            {mensajeExito}
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'var(--dashboard-green)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            Aceptar y volver al Dashboard
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {error && (
                            <div
                                role="alert"
                                style={{
                                    color: '#b91c1c',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                }}
                            >
                                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Criterio 1: Selección de la deuda pendiente */}
                        {deudasDisponibles.length > 1 && (
                            <div>
                                <label
                                    htmlFor="select-debt-item"
                                    style={{
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        marginBottom: '6px',
                                        color: 'var(--dashboard-ink)',
                                    }}
                                >
                                    Seleccionar deuda pendiente *
                                </label>
                                <select
                                    id="select-debt-item"
                                    className="dashboard-payment-control"
                                    value={selectedDeudaId}
                                    onChange={(e) => handleSelectDebtChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #dce8e2',
                                        boxSizing: 'border-box',
                                        background: '#ffffff',
                                        fontSize: '14px',
                                    }}
                                >
                                    {deudasDisponibles.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.gastoConcepto} · A favor de: {d.acreedorNombre} (Saldo: {formatCOP(d.saldoPendiente)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Tarjeta de Resumen de la Deuda Seleccionada (Criterio 4) */}
                        {activeDebt && (
                            <div
                                style={{
                                    background: '#f4f8f6',
                                    padding: '14px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid #c9ded5',
                                    fontSize: '13px',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div>
                                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#4f665c', fontWeight: 700 }}>
                                            Gasto de origen
                                        </span>
                                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1f2937' }}>
                                            {activeDebt.gastoConcepto}
                                        </div>
                                    </div>
                                    <span
                                        className={`dashboard-badge ${
                                            activeDebt.estado === 'liquidada'
                                                ? 'dashboard-badge-positive'
                                                : activeDebt.estado === 'parcial'
                                                ? 'dashboard-badge-member'
                                                : 'dashboard-badge-negative'
                                        }`}
                                    >
                                        {activeDebt.estado === 'liquidada'
                                            ? 'Liquidada'
                                            : activeDebt.estado === 'parcial'
                                            ? 'Abonada'
                                            : 'Pendiente'}
                                    </span>
                                </div>

                                {/* Enlace explícito Pagador -> Receptor (Criterio 4) */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#374151',
                                        margin: '6px 0 10px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <span style={{ fontWeight: 600 }}>{activeDebt.deudorNombre} (Deudor)</span>
                                    <ArrowRight size={14} color="var(--dashboard-green)" />
                                    <span style={{ fontWeight: 600, color: 'var(--dashboard-green)' }}>
                                        {activeDebt.acreedorNombre} (Acreedor)
                                    </span>
                                </div>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: '8px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid #dce8e2',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Cuota original:</div>
                                        <div style={{ fontWeight: 600 }}>{formatCOP(activeDebt.montoOriginal)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Abonado previo:</div>
                                        <div style={{ fontWeight: 600 }}>{formatCOP(activeDebt.montoPagado)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 700 }}>
                                            Saldo por pagar:
                                        </div>
                                        <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '14px' }}>
                                            {formatCOP(activeDebt.saldoPendiente)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Criterio 2: El usuario puede definir si corresponde a un pago parcial o total */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--dashboard-ink)' }}>
                                Modalidad de pago *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleTipoChange('total')}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: tipoPago === 'total' ? '2px solid var(--dashboard-green)' : '1px solid #dce8e2',
                                        background: tipoPago === 'total' ? '#f0fdf4' : '#ffffff',
                                        color: tipoPago === 'total' ? '#15803d' : '#374151',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        fontSize: '13px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {tipoPago === 'total' && <Check size={16} />}
                                        <span>Pago Total</span>
                                    </div>
                                    <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 500 }}>
                                        Liquidar todo ({activeDebt ? formatCOP(activeDebt.saldoPendiente) : '$0'})
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTipoChange('parcial')}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: tipoPago === 'parcial' ? '2px solid var(--dashboard-green)' : '1px solid #dce8e2',
                                        background: tipoPago === 'parcial' ? '#f0fdf4' : '#ffffff',
                                        color: tipoPago === 'parcial' ? '#15803d' : '#374151',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        fontSize: '13px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {tipoPago === 'parcial' && <Check size={16} />}
                                        <span>Pago Parcial</span>
                                    </div>
                                    <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 500 }}>
                                        Abonar una fracción
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Criterio 3: Monto del Pago (Impide valor superior al saldo adeudado) */}
                        <div>
                            <label
                                htmlFor="monto-pago-input"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    marginBottom: '6px',
                                    color: 'var(--dashboard-ink)',
                                }}
                            >
                                <span>Monto a pagar (COP) *</span>
                                {activeDebt && (
                                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
                                        Máximo permitido: <strong>{formatCOP(activeDebt.saldoPendiente)}</strong>
                                    </span>
                                )}
                            </label>
                            <input
                                id="monto-pago-input"
                                className="dashboard-payment-control"
                                type="number"
                                min="1"
                                max={activeDebt ? activeDebt.saldoPendiente : undefined}
                                step="1"
                                value={montoInput}
                                onChange={(e) => handleMontoChange(e.target.value)}
                                disabled={tipoPago === 'total' || guardando}
                                required
                                placeholder="Ej: 50000"
                                style={{
                                    width: '100%',
                                    padding: '11px 14px',
                                    borderRadius: '8px',
                                    border:
                                        error && activeDebt && Number(montoInput) > activeDebt.saldoPendiente
                                            ? '2px solid #b91c1c'
                                            : '1px solid #dce8e2',
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    boxSizing: 'border-box',
                                    background: tipoPago === 'total' ? '#f9fafb' : '#ffffff',
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                                <span>
                                    {tipoPago === 'total'
                                        ? 'Bloqueado al 100% del saldo pendiente.'
                                        : 'Puedes ingresar cualquier valor menor o igual al saldo adeudado.'}
                                </span>
                                {activeDebt && Number(montoInput) > 0 && Number(montoInput) <= activeDebt.saldoPendiente && (
                                    <span style={{ color: Number(montoInput) === activeDebt.saldoPendiente ? '#15803d' : '#2563eb', fontWeight: 600 }}>
                                        {Number(montoInput) === activeDebt.saldoPendiente
                                            ? '➜ La deuda quedará liquidada'
                                            : `➜ Quedará un saldo de ${formatCOP(activeDebt.saldoPendiente - Number(montoInput))}`}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Fecha y Nota */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                            <div>
                                <label
                                    htmlFor="fecha-pago-input"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        marginBottom: '6px',
                                        color: 'var(--dashboard-ink)',
                                    }}
                                >
                                    <Calendar size={14} color="var(--dashboard-green)" />
                                    Fecha de la transacción *
                                </label>
                                <input
                                    id="fecha-pago-input"
                                    type="date"
                                    value={fechaPago}
                                    onChange={(e) => setFechaPago(e.target.value)}
                                    required
                                    disabled={guardando}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #dce8e2',
                                        boxSizing: 'border-box',
                                        fontSize: '14px',
                                    }}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="nota-pago-input"
                                    style={{
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        marginBottom: '6px',
                                        color: 'var(--dashboard-ink)',
                                    }}
                                >
                                    Detalle o nota (opcional)
                                </label>
                                <input
                                    id="nota-pago-input"
                                    type="text"
                                    value={nota}
                                    onChange={(e) => setNota(e.target.value)}
                                    placeholder="Ej: Pago acordado en efectivo, abono por transferencia externa"
                                    disabled={guardando}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #dce8e2',
                                        boxSizing: 'border-box',
                                        fontSize: '14px',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={guardando}
                                style={{
                                    flex: 1,
                                    background: '#ffffff',
                                    color: '#4b5563',
                                    border: '1px solid #dce8e2',
                                    padding: '11px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    guardando ||
                                    !activeDebt ||
                                    !montoInput ||
                                    Number(montoInput) <= 0 ||
                                    Number(montoInput) > activeDebt.saldoPendiente
                                }
                                style={{
                                    flex: 2,
                                    background:
                                        guardando ||
                                        !activeDebt ||
                                        !montoInput ||
                                        Number(montoInput) <= 0 ||
                                        Number(montoInput) > (activeDebt?.saldoPendiente || 0)
                                            ? '#9ca3af'
                                            : 'var(--dashboard-green)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '11px 18px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor:
                                        guardando ||
                                        !activeDebt ||
                                        !montoInput ||
                                        Number(montoInput) <= 0 ||
                                        Number(montoInput) > (activeDebt?.saldoPendiente || 0)
                                            ? 'not-allowed'
                                            : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                {guardando ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Registrando pago...
                                    </>
                                ) : (
                                    `Confirmar ${tipoPago === 'total' ? 'pago total' : 'pago parcial'}`
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default RegistrarPagoModal;
