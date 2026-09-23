import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, CheckCircle2, AlertCircle, Loader2, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { buscarViviendaPorCodigo, unirseAVivienda } from '../services/dwellingService';
import { guardarIngresoMensual } from '../services/ingresoService';
import type { Dwelling } from '../models/Dwelling';

function UnirseViviendaForm() {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();

    const [codigo, setCodigo] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [viviendaEncontrada, setViviendaEncontrada] = useState<Dwelling | null>(null);
    const [ingreso, setIngreso] = useState<string>(() =>
        userProfile?.ingresoMensual && userProfile.ingresoMensual > 0
            ? String(userProfile.ingresoMensual)
            : ''
    );
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');

    const handleVerificarCodigo = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setMensajeExito('');

        const cleanCode = codigo.trim().toUpperCase();
        if (!cleanCode) {
            setError('Ingresa el código de 6 caracteres de la vivienda.');
            return;
        }

        try {
            setBuscando(true);
            const encontrada = await buscarViviendaPorCodigo(cleanCode);
            if (!encontrada) {
                setError('El código ingresado no corresponde a ninguna vivienda activa.');
                setViviendaEncontrada(null);
                return;
            }

            setViviendaEncontrada(encontrada);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al verificar el código.');
        } finally {
            setBuscando(false);
        }
    };

    const handleConfirmarVinculacion = async () => {
        if (!viviendaEncontrada) return;

        setError('');
        const numIngreso = Number(ingreso);

        // HU06: "El sistema exige o confirma el ingreso mensual individual del usuario asignado para esa vivienda al vincularse."
        if (isNaN(numIngreso) || numIngreso <= 0) {
            setError('Debes ingresar un monto mensual válido y mayor a cero para el cálculo proporcional de gastos de la vivienda.');
            return;
        }

        const effectiveUserId = user?.uid || 'usuario-prueba';

        try {
            setGuardando(true);
            // 1. Guardar ingreso mensual (HU04)
            await guardarIngresoMensual(effectiveUserId, numIngreso);

            // 2. Unirse a la vivienda (HU06)
            await unirseAVivienda(viviendaEncontrada.id, effectiveUserId);

            setMensajeExito(`¡Te has vinculado exitosamente a "${viviendaEncontrada.nombre}"!`);
            setTimeout(() => {
                navigate('/dashboard');
            }, 1200);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error al vincularse a la vivienda.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <section
            id="unirse-vivienda"
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
                    <Home size={20} />
                </div>
                <h2 style={{ fontSize: '24px', margin: 0, color: '#20302b' }}>Unirme a una vivienda</h2>
            </div>
            <p style={{ color: '#71807a', fontSize: '14px', marginBottom: '24px' }}>
                Ingresa el código único de invitación compartido por tus compañeros para formar parte del grupo.
            </p>

            {/* Paso 1: Ingreso y Verificación de Código */}
            <form onSubmit={handleVerificarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label
                        htmlFor="codigo"
                        style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#20302b' }}
                    >
                        Código de invitación (6 caracteres)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            id="codigo"
                            type="text"
                            value={codigo}
                            onChange={(e) => {
                                setCodigo(e.target.value.toUpperCase());
                                setViviendaEncontrada(null);
                                setError('');
                            }}
                            placeholder="Ej: ABC123"
                            disabled={buscando || guardando}
                            maxLength={6}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid #d9e1d9',
                                fontSize: '18px',
                                fontWeight: 700,
                                letterSpacing: '4px',
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                boxSizing: 'border-box',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={buscando || guardando || !codigo.trim()}
                            style={{
                                background: '#356b59',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 18px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            {buscando ? <Loader2 size={16} className="animate-spin" /> : 'Verificar'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Paso 2: Tarjeta de Vivienda Encontrada + Confirmación de Ingreso Mensual */}
            {viviendaEncontrada && (
                <div
                    style={{
                        marginTop: '24px',
                        padding: '20px',
                        background: '#f4f8f6',
                        borderRadius: '12px',
                        border: '1px solid #c9ded5',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#356b59', fontWeight: 700, marginBottom: '6px' }}>
                        <CheckCircle2 size={18} />
                        <span>Vivienda encontrada</span>
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#20302b' }}>{viviendaEncontrada.nombre}</h3>
                    <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#55665e' }}>
                        Dirección: {viviendaEncontrada.direccion || 'No especificada'}
                    </p>

                    <div style={{ borderTop: '1px solid #d9e7e1', paddingTop: '16px' }}>
                        <label
                            htmlFor="ingreso-confirmacion"
                            style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#20302b' }}
                        >
                            <DollarSign size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Ingreso mensual individual (COP) *
                        </label>
                        <p style={{ fontSize: '12px', color: '#71807a', margin: '0 0 10px' }}>
                            Requerido para calcular tu porcentaje de cuota proporcional en los gastos compartidos.
                        </p>
                        <input
                            id="ingreso-confirmacion"
                            type="number"
                            min="1"
                            step="1000"
                            placeholder="Ej: 2200000"
                            value={ingreso}
                            onChange={(e) => setIngreso(e.target.value)}
                            disabled={guardando}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #b5ccbf',
                                fontSize: '15px',
                                boxSizing: 'border-box',
                                marginBottom: '16px',
                            }}
                        />

                        <button
                            type="button"
                            onClick={handleConfirmarVinculacion}
                            disabled={guardando}
                            style={{
                                width: '100%',
                                background: '#356b59',
                                color: '#fff',
                                border: 'none',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {guardando ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Vinculando...
                                </>
                            ) : (
                                'Confirmar vinculación a la vivienda'
                            )}
                        </button>
                    </div>
                </div>
            )}

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

export default UnirseViviendaForm;
