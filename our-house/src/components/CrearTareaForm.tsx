import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    CheckSquare,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Calendar,
    User as UserIcon,
    FileText,
    Loader2,
    Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { obtenerViviendaPorId, obtenerIntegrantesVivienda } from '../services/dwellingService';
import { crearTarea } from '../services/taskService';
import type { Dwelling } from '../models/Dwelling';
import type { User } from '../models/User';

interface CrearTareaFormProps {
    onTaskCreated?: () => void;
    onCancel?: () => void;
    isModal?: boolean;
}

function CrearTareaForm({ onTaskCreated, onCancel, isModal = false }: CrearTareaFormProps) {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();

    const [dwelling, setDwelling] = useState<Dwelling | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form fields
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaVencimiento, setFechaVencimiento] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [responsableId, setResponsableId] = useState('');

    // Feedback states
    const [error, setError] = useState<string | null>(null);
    const [exito, setExito] = useState(false);
    const [tareaCreadaTitulo, setTareaCreadaTitulo] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadHousehold = async () => {
            const vId = userProfile?.viviendaId;
            if (!vId) {
                if (isMounted) setLoadingData(false);
                return;
            }

            try {
                const [d, integrantes] = await Promise.all([
                    obtenerViviendaPorId(vId),
                    obtenerIntegrantesVivienda(vId),
                ]);

                if (!isMounted) return;
                setDwelling(d);
                setMembers(integrantes);

                // Default assignee to current user if available, or first member
                if (user && integrantes.some((m) => m.id === user.uid)) {
                    setResponsableId(user.uid);
                } else if (integrantes.length > 0) {
                    setResponsableId(integrantes[0].id);
                }
            } catch (err) {
                console.warn('Error al cargar integrantes de la vivienda:', err);
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        loadHousehold();

        return () => {
            isMounted = false;
        };
    }, [userProfile?.viviendaId, user]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Criterio 6: El sistema rechaza el guardado si falta alguno de los datos obligatorios
        if (!userProfile?.viviendaId) {
            setError('Debes pertenecer a una vivienda para crear y asignar tareas.');
            return;
        }

        const tituloLimpio = titulo.trim();
        if (!tituloLimpio) {
            setError('El título de la tarea es obligatorio.');
            return;
        }

        const fechaLimpia = fechaVencimiento.trim();
        if (!fechaLimpia) {
            setError('Debes establecer una fecha límite o programada.');
            return;
        }

        const responsableLimpio = responsableId.trim();
        if (!responsableLimpio) {
            setError('Debes asignar la tarea a un integrante específico de la vivienda.');
            return;
        }

        const responsableSeleccionado = members.find((m) => m.id === responsableLimpio);
        const responsableNombre = responsableSeleccionado?.nombre || 'Integrante';

        try {
            setGuardando(true);
            await crearTarea({
                viviendaId: userProfile.viviendaId,
                titulo: tituloLimpio,
                descripcion: descripcion.trim(),
                responsableId: responsableLimpio,
                responsableNombre,
                fechaVencimiento: fechaLimpia,
            });

            setTareaCreadaTitulo(tituloLimpio);
            setExito(true);

            if (onTaskCreated) {
                onTaskCreated();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al guardar la tarea doméstica.');
        } finally {
            setGuardando(false);
        }
    };

    const handleResetParaNueva = () => {
        setTitulo('');
        setDescripcion('');
        setFechaVencimiento(new Date().toISOString().split('T')[0]);
        if (user && members.some((m) => m.id === user.uid)) {
            setResponsableId(user.uid);
        } else if (members.length > 0) {
            setResponsableId(members[0].id);
        }
        setError(null);
        setExito(false);
    };

    const containerStyle = isModal
        ? { padding: '4px', textAlign: 'left' as const }
        : {
              maxWidth: '560px',
              margin: '36px auto',
              padding: '32px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2ece7',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
              textAlign: 'left' as const,
              boxSizing: 'border-box' as const,
          };

    if (loadingData) {
        return (
            <div style={containerStyle}>
                <div style={{ textAlign: 'center', padding: '32px', color: '#55665e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Cargando información de la vivienda...</span>
                </div>
            </div>
        );
    }

    if (!userProfile?.viviendaId) {
        return (
            <div style={containerStyle}>
                {!isModal && (
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
                )}
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <AlertCircle size={40} color="#b91c1c" style={{ margin: '0 auto 12px' }} />
                    <h3 style={{ margin: '0 0 8px', fontSize: '20px', color: '#20302b' }}>
                        No perteneces a una vivienda
                    </h3>
                    <p style={{ color: '#55665e', fontSize: '14px', marginBottom: '20px' }}>
                        Para crear y asignar tareas domésticas, primero debes crear o unirte a una vivienda.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <Link
                            to="/crear-vivienda"
                            style={{
                                background: '#356b59',
                                color: '#ffffff',
                                textDecoration: 'none',
                                padding: '10px 18px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '14px',
                            }}
                        >
                            Crear vivienda
                        </Link>
                        <Link
                            to="/unirse-vivienda"
                            style={{
                                background: '#ffffff',
                                color: '#356b59',
                                border: '1px solid #356b59',
                                textDecoration: 'none',
                                padding: '10px 18px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '14px',
                            }}
                        >
                            Unirse con código
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <section id="crear-tarea" style={containerStyle}>
            {!isModal && (
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
            )}

            {!isModal && (
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
                        <CheckSquare size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '22px', margin: 0, color: '#20302b' }}>
                            Crear tarea doméstica
                        </h2>
                        {dwelling && (
                            <span style={{ fontSize: '12px', color: '#55665e' }}>
                                Para: <strong>{dwelling.nombre}</strong>
                            </span>
                        )}
                    </div>
                </div>
            )}

            {!isModal && (
                <p style={{ color: '#71807a', fontSize: '14px', marginBottom: '22px' }}>
                    Organiza las responsabilidades del hogar asignando título, descripción detallada, fecha límite y responsable.
                </p>
            )}

            {exito ? (
                <div
                    style={{
                        padding: '24px',
                        background: '#f4f8f6',
                        borderRadius: '12px',
                        border: '1px solid #c9ded5',
                        textAlign: 'center',
                    }}
                >
                    <CheckCircle2 size={44} color="#356b59" style={{ margin: '0 auto 12px' }} />
                    <h3 style={{ margin: '0 0 6px', fontSize: '20px', color: '#20302b' }}>
                        ¡Tarea creada y asignada exitosamente!
                    </h3>
                    <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#55665e' }}>
                        Se programó la tarea <strong>"{tareaCreadaTitulo}"</strong> para el integrante seleccionado.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={handleResetParaNueva}
                            style={{
                                width: '100%',
                                background: '#356b59',
                                color: '#ffffff',
                                border: 'none',
                                padding: '11px 18px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                            }}
                        >
                            <Plus size={16} /> Crear otra tarea
                        </button>
                        {!isModal ? (
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                style={{
                                    width: '100%',
                                    background: '#ffffff',
                                    color: '#356b59',
                                    border: '1px solid #356b59',
                                    padding: '11px 18px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Volver al Dashboard
                            </button>
                        ) : (
                            onCancel && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    style={{
                                        width: '100%',
                                        background: '#ffffff',
                                        color: '#356b59',
                                        border: '1px solid #356b59',
                                        padding: '11px 18px',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cerrar
                                </button>
                            )
                        )}
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>
                    {/* Inline Error Banner - Criterio 6 */}
                    {error && (
                        <div
                            role="alert"
                            aria-live="assertive"
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

                    {/* Criterio 2: El sistema solicita el título de la tarea */}
                    <div>
                        <label
                            htmlFor="task-title-input"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '6px',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#20302b',
                            }}
                        >
                            <FileText size={15} color="#356b59" />
                            Título de la tarea *
                        </label>
                        <input
                            id="task-title-input"
                            type="text"
                            value={titulo}
                            onChange={(e) => {
                                setTitulo(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="Ej: Limpiar estufa y horno, Lavar baños compartidos"
                            disabled={guardando}
                            required
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: error && !titulo.trim() ? '1.5px solid #dc2626' : '1px solid #d9e1d9',
                                fontSize: '14px',
                                boxSizing: 'border-box',
                            }}
                        />
                        <span style={{ fontSize: '11px', color: '#71807a', marginTop: '4px', display: 'block' }}>
                            Ingresa una denominación clara de la labor a efectuar.
                        </span>
                    </div>

                    {/* Criterio 3: El sistema permite ingresar una descripción detallada */}
                    <div>
                        <label
                            htmlFor="task-description-input"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '6px',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#20302b',
                            }}
                        >
                            <FileText size={15} color="#356b59" />
                            Descripción detallada
                        </label>
                        <textarea
                            id="task-description-input"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Describe los pasos, recomendaciones, productos a utilizar o especificaciones de la tarea..."
                            rows={3}
                            disabled={guardando}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d9e1d9',
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                            }}
                        />
                        <span style={{ fontSize: '11px', color: '#71807a', marginTop: '4px', display: 'block' }}>
                            Opcional. Información adicional para la persona encargada.
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                        {/* Criterio 4: El sistema exige establecer una fecha límite o programada */}
                        <div>
                            <label
                                htmlFor="task-due-date-input"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '6px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#20302b',
                                }}
                            >
                                <Calendar size={15} color="#356b59" />
                                Fecha programada o límite *
                            </label>
                            <input
                                id="task-due-date-input"
                                type="date"
                                value={fechaVencimiento}
                                onChange={(e) => {
                                    setFechaVencimiento(e.target.value);
                                    if (error) setError(null);
                                }}
                                disabled={guardando}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: error && !fechaVencimiento.trim() ? '1.5px solid #dc2626' : '1px solid #d9e1d9',
                                    fontSize: '14px',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <span style={{ fontSize: '11px', color: '#71807a', marginTop: '4px', display: 'block' }}>
                                Fecha en la que debe concluirse.
                            </span>
                        </div>

                        {/* Criterio 5: El sistema permite asignar la tarea a un integrante específico de la vivienda */}
                        <div>
                            <label
                                htmlFor="task-assignee-select"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '6px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#20302b',
                                }}
                            >
                                <UserIcon size={15} color="#356b59" />
                                Integrante responsable *
                            </label>
                            <select
                                id="task-assignee-select"
                                value={responsableId}
                                onChange={(e) => {
                                    setResponsableId(e.target.value);
                                    if (error) setError(null);
                                }}
                                disabled={guardando}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: error && !responsableId.trim() ? '1.5px solid #dc2626' : '1px solid #d9e1d9',
                                    fontSize: '14px',
                                    boxSizing: 'border-box',
                                    background: '#ffffff',
                                }}
                            >
                                <option value="">-- Seleccionar integrante --</option>
                                {members.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.nombre} {m.id === user?.uid ? '(Tú)' : ''}
                                    </option>
                                ))}
                            </select>
                            <span style={{ fontSize: '11px', color: '#71807a', marginTop: '4px', display: 'block' }}>
                                Responsable asignado de la casa.
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        {isModal && onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={guardando}
                                style={{
                                    flex: 1,
                                    background: '#ffffff',
                                    color: '#55665e',
                                    border: '1px solid #d9e1d9',
                                    padding: '11px 18px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={guardando}
                            style={{
                                flex: isModal ? 2 : 1,
                                background: '#356b59',
                                color: '#ffffff',
                                border: 'none',
                                padding: '12px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
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
                                    <Loader2 size={16} className="animate-spin" /> Guardando tarea...
                                </>
                            ) : (
                                'Guardar y asignar tarea'
                            )}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

export default CrearTareaForm;
