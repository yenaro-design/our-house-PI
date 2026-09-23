import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DollarSign, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { guardarIngresoMensual } from '../services/ingresoService';

function IngresoMensualForm() {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const [ingreso, setIngreso] = useState<string>(() =>
        userProfile?.ingresoMensual && userProfile.ingresoMensual > 0
            ? String(userProfile.ingresoMensual)
            : ''
    );
    const [error, setError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');
    const [guardando, setGuardando] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setMensajeExito('');

        const cleanStr = ingreso.trim();
        const valor = Number(cleanStr);

        // HU04: Validar que sea un número positivo mayor a cero
        if (cleanStr === '' || isNaN(valor)) {
            setError('Ingresa un monto numérico válido.');
            return;
        }

        if (valor <= 0) {
            setError('El ingreso mensual debe ser un número positivo mayor a cero (> 0).');
            return;
        }

        if (valor > 1_000_000_000) {
            setError('El valor ingresado excede el límite máximo permitido.');
            return;
        }

        const effectiveUserId = user?.uid || 'usuario-prueba';

        try {
            setGuardando(true);
            await guardarIngresoMensual(effectiveUserId, valor);
            setMensajeExito(
                `Ingreso mensual de ${new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                }).format(valor)} registrado con éxito.`
            );
            setTimeout(() => {
                navigate('/dashboard');
            }, 1400);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al guardar el ingreso mensual.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <section
            id="ingreso-mensual"
            style={{
                maxWidth: '520px',
                margin: '40px auto',
                padding: '32px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2ece7',
                boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                textAlign: 'left',
                boxSizing: 'border-box',
            }}
        >
            <Link
                to="/dashboard"
                style={{
                    color: '#356b59',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '18px',
                }}
            >
                <ArrowLeft size={16} /> Volver al Dashboard
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(53,107,89,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#356b59',
                    }}
                >
                    <DollarSign size={20} />
                </div>
                <h2 style={{ fontSize: '24px', margin: 0, color: '#20302b' }}>Ingreso Mensual Individual</h2>
            </div>
            <p style={{ color: '#71807a', fontSize: '14px', marginBottom: '20px' }}>
                Configura o actualiza tu ingreso individual estimado para que el sistema calcule de forma exacta y
                justa tu cuota proporcional en los gastos compartidos del hogar.
            </p>

            <div
                style={{
                    padding: '14px 16px',
                    background: '#f4f8f6',
                    borderRadius: '10px',
                    border: '1px solid #d0e2d9',
                    marginBottom: '20px',
                    fontSize: '13px',
                    color: '#3f564d',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                }}
            >
                <Calculator size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#356b59' }} />
                <div>
                    <strong>Fórmula de distribución proporcional:</strong>
                    <br />
                    <code>Cuota = MontoGasto · (IngresoIndividual / TotalIngresosParticipantes)</code>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label
                        htmlFor="ingreso"
                        style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#20302b' }}
                    >
                        Monto mensual en pesos (COP) *
                    </label>
                    <input
                        id="ingreso"
                        type="number"
                        min="1"
                        step="1000"
                        value={ingreso}
                        onChange={(e) => setIngreso(e.target.value)}
                        placeholder="Ej: 2500000"
                        disabled={guardando}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #d9e1d9',
                            fontSize: '16px',
                            fontWeight: 600,
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={guardando}
                    style={{
                        background: '#356b59',
                        color: '#fff',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    {guardando ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Guardando ingreso...
                        </>
                    ) : (
                        'Guardar y actualizar cuota'
                    )}
                </button>
            </form>

            {error && (
                <div
                    style={{
                        color: '#b91c1c',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        marginTop: '16px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {mensajeExito && (
                <div
                    style={{
                        color: '#15803d',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        marginTop: '16px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                    }}
                >
                    <CheckCircle2 size={16} />
                    <span>{mensajeExito}</span>
                </div>
            )}
        </section>
    );
}

export default IngresoMensualForm;
