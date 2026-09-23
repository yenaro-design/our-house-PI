import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, CheckCircle2, AlertCircle, Copy, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { crearVivienda } from '../services/dwellingService';

function CrearViviendaForm() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [error, setError] = useState('');
    const [codigoGenerado, setCodigoGenerado] = useState('');
    const [copiado, setCopiado] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (nombre.trim() === '') {
            setError('El nombre de la vivienda es obligatorio.');
            return;
        }

        if (direccion.trim() === '') {
            setError('La dirección de la vivienda es obligatoria.');
            return;
        }

        const effectiveUserId = user?.uid || 'usuario-prueba';

        try {
            setGuardando(true);
            const vivienda = await crearVivienda(
                { nombre: nombre.trim(), direccion: direccion.trim() },
                effectiveUserId
            );
            setCodigoGenerado(vivienda.codigoInvitacion);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error al crear la vivienda.');
        } finally {
            setGuardando(false);
        }
    };

    const handleCopy = async () => {
        if (!codigoGenerado) return;
        try {
            await navigator.clipboard.writeText(codigoGenerado);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    return (
        <section
            id="crear-vivienda"
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
                <h2 style={{ fontSize: '24px', margin: 0, color: '#20302b' }}>Crear nueva vivienda</h2>
            </div>
            <p style={{ color: '#71807a', fontSize: '14px', marginBottom: '24px' }}>
                Registra tu espacio compartido. Quedarás configurado automáticamente como administrador e integrante.
            </p>

            {!codigoGenerado ? (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label
                            htmlFor="nombre"
                            style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#20302b' }}
                        >
                            Nombre de la vivienda *
                        </label>
                        <input
                            id="nombre"
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Apartamento 402 Los Cedros"
                            disabled={guardando}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d9e1d9',
                                fontSize: '15px',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="direccion"
                            style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#20302b' }}
                        >
                            Dirección o ubicación *
                        </label>
                        <input
                            id="direccion"
                            type="text"
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                            placeholder="Ej: Carrera 45 # 12-30"
                            disabled={guardando}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d9e1d9',
                                fontSize: '15px',
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
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        {guardando ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Creando espacio...
                            </>
                        ) : (
                            'Crear vivienda y generar código'
                        )}
                    </button>
                </form>
            ) : (
                <div
                    style={{
                        padding: '24px',
                        background: '#f4f8f6',
                        borderRadius: '12px',
                        border: '1px solid #c9ded5',
                        textAlign: 'center',
                    }}
                >
                    <CheckCircle2 size={42} color="#356b59" style={{ margin: '0 auto 12px' }} />
                    <h3 style={{ margin: '0 0 6px', fontSize: '20px', color: '#20302b' }}>
                        ¡Vivienda creada exitosamente!
                    </h3>
                    <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#55665e' }}>
                        Comparte este código de invitación con tus compañeros para que puedan unirse:
                    </p>

                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: '#ffffff',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            border: '2px dashed #356b59',
                            marginBottom: '20px',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '28px',
                                fontWeight: 800,
                                letterSpacing: '4px',
                                color: '#356b59',
                                fontFamily: 'monospace',
                            }}
                        >
                            {codigoGenerado}
                        </span>
                        <button
                            type="button"
                            onClick={handleCopy}
                            style={{
                                background: '#356b59',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                            }}
                        >
                            {copiado ? <Check size={14} /> : <Copy size={14} />}
                            {copiado ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            style={{
                                width: '100%',
                                background: '#356b59',
                                color: '#ffffff',
                                border: 'none',
                                padding: '12px 20px',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Ir al Dashboard de la vivienda
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
        </section>
    );
}

export default CrearViviendaForm;
