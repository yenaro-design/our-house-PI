import { useState, useMemo } from 'react';
import {
    CheckSquare,
    Square,
    Calendar,
    User as UserIcon,
    CheckCircle2,
    Clock,
    Search,
    Filter,
    ArrowUpDown,
    Plus,
    Check,
    AlertTriangle,
    Pencil,
    Trash2,
} from 'lucide-react';
import type { Task } from '../models/Task';
import type { User } from '../models/User';
import {
    filtrarYOrdenarTareas,
    getDueDateBadge,
} from '../services/taskService';
import type {
    TaskFilterPredicate,
    TaskSortComparator,
} from '../services/taskService';

export type TaskSortOption =
    | 'fechaVencimientoAsc'
    | 'fechaVencimientoDesc'
    | 'fechaCompletadaDesc'
    | 'fechaCompletadaAsc'
    | 'titulo';

export type EstadoFiltroTareas = 'pendientes' | 'mis_pendientes' | 'vencidas' | 'completadas';

export interface ConsultarTareasPendientesProps {
    viviendaId: string;
    viviendaNombre?: string;
    currentUserId?: string;
    administradorId?: string;
    members?: User[];
    tasks: Task[];
    onToggleTask: (taskId: string, current: boolean) => Promise<void>;
    onSolicitarCompletarTask?: (task: Task) => void;
    onOpenCrearTareaModal?: () => void;
    onEditarTask?: (task: Task) => void;
    onEliminarTask?: (task: Task) => void;
    // Puntos de extensión para Principio Abierto/Cerrado (OCP)
    customFilter?: TaskFilterPredicate;
    customSort?: TaskSortComparator;
    showFilters?: boolean;
    initialView?: 'pendientes' | 'completadas';
}

export default function ConsultarTareasPendientes({
    viviendaId,
    viviendaNombre,
    currentUserId,
    administradorId,
    members = [],
    tasks,
    onToggleTask,
    onSolicitarCompletarTask,
    onOpenCrearTareaModal,
    onEditarTask,
    onEliminarTask,
    customFilter,
    customSort,
    showFilters = true,
    initialView = 'pendientes',
}: ConsultarTareasPendientesProps) {
    // Estado de filtros extensibles
    const [busqueda, setBusqueda] = useState('');
    const [filtroResponsable, setFiltroResponsable] = useState<string>('todos');
    const [vistaActiva, setVistaActiva] = useState<'pendientes' | 'completadas'>(initialView);
    const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltroTareas>(
        initialView === 'completadas' ? 'completadas' : 'pendientes'
    );
    const [orden, setOrden] = useState<TaskSortOption>(
        initialView === 'completadas' ? 'fechaCompletadaDesc' : 'fechaVencimientoAsc'
    );
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const esAdministrador = Boolean(currentUserId && administradorId && currentUserId === administradorId);
    const [mensajeFeedback, setMensajeFeedback] = useState<string | null>(null);

    // Selección interactiva de estado entre las 4 tarjetas principales
    const seleccionarEstado = (nuevoEstado: EstadoFiltroTareas) => {
        setEstadoFiltro(nuevoEstado);
        if (nuevoEstado === 'completadas') {
            setVistaActiva('completadas');
            setOrden('fechaCompletadaDesc');
        } else {
            setVistaActiva('pendientes');
            setOrden('fechaVencimientoAsc');
        }

        if (nuevoEstado === 'mis_pendientes' && currentUserId) {
            setFiltroResponsable(currentUserId);
        } else if (filtroResponsable === currentUserId && (nuevoEstado === 'pendientes' || nuevoEstado === 'vencidas')) {
            setFiltroResponsable('todos');
        }
    };

    // 1. Filtrado de tareas pertenecientes a la vivienda del usuario (Criterio 2)
    const tareasVivienda = useMemo(() => {
        return tasks.filter((t) => t.viviendaId === viviendaId);
    }, [tasks, viviendaId]);

    // Estadísticas globales para el panel
    const totalPendientes = useMemo(() => {
        return tareasVivienda.filter((t) => !t.completada).length;
    }, [tareasVivienda]);

    const totalCompletadas = useMemo(() => {
        return tareasVivienda.filter((t) => t.completada).length;
    }, [tareasVivienda]);

    const misPendientesCount = useMemo(() => {
        if (!currentUserId) return 0;
        return tareasVivienda.filter((t) => !t.completada && t.responsableId === currentUserId).length;
    }, [tareasVivienda, currentUserId]);

    const vencidasCount = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return tareasVivienda.filter((t) => {
            if (t.completada || !t.fechaVencimiento) return false;
            const d = new Date(`${t.fechaVencimiento}T00:00:00`);
            return !isNaN(d.getTime()) && d.getTime() < today.getTime();
        }).length;
    }, [tareasVivienda]);

    // 2. Consulta y ordenamiento aplicando OCP
    const tareasMostradas = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return filtrarYOrdenarTareas(tareasVivienda, {
            estado: vistaActiva, // 'pendientes' o 'completadas'
            responsableId: estadoFiltro === 'mis_pendientes' && currentUserId ? currentUserId : filtroResponsable,
            busqueda,
            orden,
            filtroPersonalizado: (t) => {
                if (estadoFiltro === 'vencidas') {
                    if (t.completada || !t.fechaVencimiento) return false;
                    const d = new Date(`${t.fechaVencimiento}T00:00:00`);
                    if (isNaN(d.getTime()) || d.getTime() >= today.getTime()) {
                        return false;
                    }
                }
                if (customFilter && !customFilter(t)) {
                    return false;
                }
                return true;
            },
            comparadorPersonalizado: customSort,
        });
    }, [tareasVivienda, vistaActiva, estadoFiltro, currentUserId, filtroResponsable, busqueda, orden, customFilter, customSort]);

    const tituloVista = useMemo(() => {
        switch (estadoFiltro) {
            case 'mis_pendientes':
                return 'Mis Tareas Asignadas';
            case 'vencidas':
                return 'Tareas Vencidas del Hogar';
            case 'completadas':
                return 'Historial de Tareas Completadas';
            default:
                return 'Tareas del Hogar';
        }
    }, [estadoFiltro]);

    const descripcionVista = useMemo(() => {
        switch (estadoFiltro) {
            case 'mis_pendientes':
                return 'Consulta y realiza seguimiento de las actividades pendientes asignadas bajo tu responsabilidad.';
            case 'vencidas':
                return 'Actividades programadas que ya superaron su fecha límite y requieren atención prioritaria.';
            case 'completadas':
                return 'Consulta y realiza seguimiento del cumplimiento histórico de las actividades domésticas realizadas.';
            default:
                return 'Consulta las actividades pendientes ordenadas por fecha de vencimiento y responsable asignado.';
        }
    }, [estadoFiltro]);

    const handleToggle = async (t: Task) => {
        if (!t.completada && onSolicitarCompletarTask) {
            onSolicitarCompletarTask(t);
            return;
        }

        try {
            setUpdatingTaskId(t.id);
            await onToggleTask(t.id, t.completada);
            if (!t.completada) {
                setMensajeFeedback(`¡Excelente! Tarea "${t.titulo}" marcada como completada.`);
            } else {
                setMensajeFeedback(`Tarea "${t.titulo}" restablecida a pendientes.`);
            }
            setTimeout(() => setMensajeFeedback(null), 3500);
        } catch (err) {
            console.error('Error al actualizar estado de la tarea:', err);
        } finally {
            setUpdatingTaskId(null);
        }
    };

    return (
        <div className="consultar-tareas-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Encabezado y Acciones Principales */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}
            >
                <div>
                    <h2 style={{ fontSize: '22px', margin: '0 0 4px', color: 'var(--dashboard-ink)' }}>
                        {tituloVista} {viviendaNombre ? `· ${viviendaNombre}` : ''}
                    </h2>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--dashboard-muted)' }}>
                        {descripcionVista}
                    </p>
                </div>

                {onOpenCrearTareaModal && (
                    <button
                        type="button"
                        className="dashboard-primary-action"
                        onClick={onOpenCrearTareaModal}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={16} /> Crear nueva tarea
                    </button>
                )}
            </div>

            {/* Banner de Feedback Tras Completar */}
            {mensajeFeedback && (
                <div
                    style={{
                        background: '#eef8f2',
                        border: '1px solid #cce8d8',
                        color: 'var(--dashboard-green)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <CheckCircle2 size={16} />
                    <span>{mensajeFeedback}</span>
                </div>
            )}

            {/* Tarjetas de Estados Principales (Botones Interactivos de Navegación) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                }}
            >
                {/* 1. Tareas Pendientes */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => seleccionarEstado('pendientes')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            seleccionarEstado('pendientes');
                        }
                    }}
                    style={{
                        background: estadoFiltro === 'pendientes' ? '#f4f8f6' : '#ffffff',
                        border: estadoFiltro === 'pendientes' ? '2px solid var(--dashboard-green)' : '1px solid var(--dashboard-line)',
                        boxShadow: estadoFiltro === 'pendientes' ? '0 4px 12px rgba(34, 197, 94, 0.15)' : 'none',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                    }}
                    title="Ver todas las tareas pendientes de la vivienda"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: estadoFiltro === 'pendientes' ? 'var(--dashboard-green)' : 'var(--dashboard-muted)' }}>
                            Tareas Pendientes
                        </span>
                        <Clock size={16} color="var(--dashboard-green)" />
                    </div>
                    <strong style={{ fontSize: '24px', color: 'var(--dashboard-ink)' }}>{totalPendientes}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dashboard-muted)' }}>
                        Por realizar en el hogar
                    </p>
                </div>

                {/* 2. Asignadas a Mí */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => seleccionarEstado('mis_pendientes')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            seleccionarEstado('mis_pendientes');
                        }
                    }}
                    style={{
                        background: estadoFiltro === 'mis_pendientes' ? '#f4f8f6' : '#ffffff',
                        border: estadoFiltro === 'mis_pendientes' ? '2px solid var(--dashboard-green)' : '1px solid var(--dashboard-line)',
                        boxShadow: estadoFiltro === 'mis_pendientes' ? '0 4px 12px rgba(34, 197, 94, 0.15)' : 'none',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                    }}
                    title="Ver solo las tareas pendientes asignadas a ti"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: estadoFiltro === 'mis_pendientes' ? 'var(--dashboard-green)' : 'var(--dashboard-muted)' }}>
                            Asignadas a Mí
                        </span>
                        <UserIcon size={16} color="var(--dashboard-green)" />
                    </div>
                    <strong style={{ fontSize: '24px', color: 'var(--dashboard-ink)' }}>{misPendientesCount}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dashboard-muted)' }}>
                        Bajo tu responsabilidad
                    </p>
                </div>

                {/* 3. Tareas Vencidas */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => seleccionarEstado('vencidas')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            seleccionarEstado('vencidas');
                        }
                    }}
                    style={{
                        background:
                            estadoFiltro === 'vencidas'
                                ? '#fee2e2'
                                : vencidasCount > 0
                                ? '#fef2f2'
                                : '#ffffff',
                        border:
                            estadoFiltro === 'vencidas'
                                ? '2px solid #b91c1c'
                                : vencidasCount > 0
                                ? '1px solid #fecaca'
                                : '1px solid var(--dashboard-line)',
                        boxShadow: estadoFiltro === 'vencidas' ? '0 4px 12px rgba(185, 28, 28, 0.2)' : 'none',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                    }}
                    title="Ver tareas pendientes con fecha de vencimiento expirada"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span
                            style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: vencidasCount > 0 || estadoFiltro === 'vencidas' ? '#b91c1c' : 'var(--dashboard-muted)',
                            }}
                        >
                            Tareas Vencidas
                        </span>
                        <AlertTriangle
                            size={16}
                            color={vencidasCount > 0 || estadoFiltro === 'vencidas' ? '#b91c1c' : 'var(--dashboard-muted)'}
                        />
                    </div>
                    <strong
                        style={{
                            fontSize: '24px',
                            color: vencidasCount > 0 || estadoFiltro === 'vencidas' ? '#b91c1c' : 'var(--dashboard-ink)',
                        }}
                    >
                        {vencidasCount}
                    </strong>
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: '12px',
                            color: vencidasCount > 0 || estadoFiltro === 'vencidas' ? '#b91c1c' : 'var(--dashboard-muted)',
                        }}
                    >
                        {vencidasCount > 0 ? 'Requieren atención prioritaria' : 'Sin tareas vencidas'}
                    </p>
                </div>

                {/* 4. Historial Completadas */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => seleccionarEstado('completadas')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            seleccionarEstado('completadas');
                        }
                    }}
                    style={{
                        background: estadoFiltro === 'completadas' ? '#f4f8f6' : '#ffffff',
                        border: estadoFiltro === 'completadas' ? '2px solid var(--dashboard-green)' : '1px solid var(--dashboard-line)',
                        boxShadow: estadoFiltro === 'completadas' ? '0 4px 12px rgba(34, 197, 94, 0.15)' : 'none',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                    }}
                    title="Consultar el historial de actividades completadas"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: estadoFiltro === 'completadas' ? 'var(--dashboard-green)' : 'var(--dashboard-muted)' }}>
                            Historial Completadas
                        </span>
                        <CheckCircle2 size={16} color="#15803d" />
                    </div>
                    <strong style={{ fontSize: '24px', color: '#15803d' }}>{totalCompletadas}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dashboard-muted)' }}>
                        Completadas con éxito
                    </p>
                </div>
            </div>

            {/* Pestañas de Vista y Filtros (Abierto a Extensión) */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid var(--dashboard-line)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        borderBottom: '1px solid var(--dashboard-line)',
                        paddingBottom: '12px',
                    }}
                >
                    {/* Selector de Estado: 4 Estados Sincronizados con las Tarjetas Superiores */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => seleccionarEstado('pendientes')}
                            style={{
                                background: estadoFiltro === 'pendientes' ? 'var(--dashboard-green)' : '#f4f8f6',
                                color: estadoFiltro === 'pendientes' ? '#ffffff' : 'var(--dashboard-ink)',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <Clock size={14} />
                            Pendientes ({totalPendientes})
                        </button>
                        <button
                            type="button"
                            onClick={() => seleccionarEstado('mis_pendientes')}
                            style={{
                                background: estadoFiltro === 'mis_pendientes' ? 'var(--dashboard-green)' : '#f4f8f6',
                                color: estadoFiltro === 'mis_pendientes' ? '#ffffff' : 'var(--dashboard-ink)',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <UserIcon size={14} />
                            Asignadas a mí ({misPendientesCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => seleccionarEstado('vencidas')}
                            style={{
                                background:
                                    estadoFiltro === 'vencidas'
                                        ? '#b91c1c'
                                        : vencidasCount > 0
                                        ? '#fef2f2'
                                        : '#f4f8f6',
                                color:
                                    estadoFiltro === 'vencidas'
                                        ? '#ffffff'
                                        : vencidasCount > 0
                                        ? '#b91c1c'
                                        : 'var(--dashboard-ink)',
                                border:
                                    estadoFiltro === 'vencidas'
                                        ? 'none'
                                        : vencidasCount > 0
                                        ? '1px solid #fecaca'
                                        : 'none',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <AlertTriangle size={14} />
                            Vencidas ({vencidasCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => seleccionarEstado('completadas')}
                            style={{
                                background: estadoFiltro === 'completadas' ? 'var(--dashboard-green)' : '#f4f8f6',
                                color: estadoFiltro === 'completadas' ? '#ffffff' : 'var(--dashboard-ink)',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <CheckSquare size={14} />
                            Historial Completadas ({totalCompletadas})
                        </button>
                    </div>

                    {/* Orden extensible según la vista activa (Criterio 3 y 4) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label
                            htmlFor="task-sort-select"
                            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dashboard-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <ArrowUpDown size={14} /> Organizar por:
                        </label>
                        <select
                            id="task-sort-select"
                            value={orden}
                            onChange={(e) => setOrden(e.target.value as TaskSortOption)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--dashboard-line)',
                                fontSize: '12px',
                                background: '#ffffff',
                                color: 'var(--dashboard-ink)',
                                fontWeight: 600,
                            }}
                        >
                            {vistaActiva === 'completadas' ? (
                                <>
                                    <option value="fechaCompletadaDesc">Completadas más recientemente</option>
                                    <option value="fechaCompletadaAsc">Completadas más antiguas primero</option>
                                    <option value="fechaVencimientoDesc">Fecha límite (más lejanas primero)</option>
                                    <option value="fechaVencimientoAsc">Fecha límite (más próximas primero)</option>
                                    <option value="titulo">Título de la tarea (A - Z)</option>
                                </>
                            ) : (
                                <>
                                    <option value="fechaVencimientoAsc">Fecha de vencimiento (Más próximas primero)</option>
                                    <option value="fechaVencimientoDesc">Fecha de vencimiento (Más lejanas primero)</option>
                                    <option value="titulo">Título de la tarea (A - Z)</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                {/* Filtros OCP de Búsqueda y Responsable (Criterio 2 y 4) */}
                {showFilters && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '12px',
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <Search
                                size={15}
                                style={{
                                    position: 'absolute',
                                    left: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--dashboard-muted)',
                                }}
                            />
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder={
                                    estadoFiltro === 'completadas'
                                        ? 'Buscar en el historial de tareas completadas...'
                                        : estadoFiltro === 'vencidas'
                                        ? 'Buscar entre las tareas vencidas...'
                                        : estadoFiltro === 'mis_pendientes'
                                        ? 'Buscar entre mis tareas asignadas...'
                                        : 'Buscar por labor o descripción...'
                                }
                                style={{
                                    width: '100%',
                                    padding: '8px 10px 8px 32px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--dashboard-line)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Filter size={15} color="var(--dashboard-muted)" />
                            <select
                                value={filtroResponsable}
                                onChange={(e) => setFiltroResponsable(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--dashboard-line)',
                                    fontSize: '13px',
                                    background: '#ffffff',
                                    boxSizing: 'border-box',
                                }}
                            >
                                <option value="todos">Todos los responsables</option>
                                {currentUserId && <option value={currentUserId}>Asignadas a mí (Tú)</option>}
                                {members
                                    .filter((m) => m.id !== currentUserId)
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.nombre}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Listado de Tareas */}
            {tareasMostradas.length === 0 ? (
                <div
                    style={{
                        background: '#ffffff',
                        padding: '44px 20px',
                        textAlign: 'center',
                        borderRadius: '12px',
                        border: '1px solid var(--dashboard-line)',
                        color: 'var(--dashboard-muted)',
                    }}
                >
                    <div
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: estadoFiltro === 'vencidas' ? '#fef2f2' : '#f4f8f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px',
                            color: estadoFiltro === 'vencidas' ? '#b91c1c' : 'var(--dashboard-green)',
                        }}
                    >
                        {estadoFiltro === 'vencidas' ? (
                            <AlertTriangle size={24} />
                        ) : estadoFiltro === 'mis_pendientes' ? (
                            <UserIcon size={24} />
                        ) : (
                            <CheckSquare size={24} />
                        )}
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--dashboard-ink)' }}>
                        {busqueda.trim()
                            ? 'No se encontraron tareas con los filtros aplicados'
                            : estadoFiltro === 'pendientes'
                            ? 'No hay tareas pendientes en este momento'
                            : estadoFiltro === 'mis_pendientes'
                            ? 'No tienes tareas pendientes asignadas'
                            : estadoFiltro === 'vencidas'
                            ? '¡Al día! No hay tareas vencidas'
                            : 'No hay tareas completadas registradas'}
                    </h3>
                    <p style={{ margin: '0 0 16px', fontSize: '14px', maxWidth: '440px', marginInline: 'auto' }}>
                        {busqueda.trim()
                            ? 'Intenta modificar el término de búsqueda o seleccionar otro estado de tareas.'
                            : estadoFiltro === 'pendientes'
                            ? 'Todas las responsabilidades del hogar están al día. Puedes registrar una nueva tarea cuando sea necesario.'
                            : estadoFiltro === 'mis_pendientes'
                            ? '¡Excelente trabajo! No tienes labores pendientes asignadas bajo tu responsabilidad.'
                            : estadoFiltro === 'vencidas'
                            ? 'Ninguna actividad doméstica tiene fecha de vencimiento expirada en la vivienda.'
                            : 'Las tareas que vayas completando en la vivienda se archivarán aquí automáticamente para su seguimiento histórico.'}
                    </p>
                    {estadoFiltro !== 'completadas' && onOpenCrearTareaModal && (
                        <button
                            type="button"
                            onClick={onOpenCrearTareaModal}
                            style={{
                                background: 'var(--dashboard-green)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '9px 18px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            + Asignar nueva tarea
                        </button>
                    )}
                </div>
            ) : (
                <div className="dashboard-table-container" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--dashboard-line)', overflow: 'hidden' }}>
                    <table className="dashboard-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8faf9', borderBottom: '1px solid var(--dashboard-line)' }}>
                                <th style={{ width: '48px', textAlign: 'center', padding: '12px' }}>Estado</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Tarea y Descripción</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Responsable Asignado</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>
                                    {vistaActiva === 'completadas' ? 'Fecha de Realización' : 'Fecha de Vencimiento'}
                                </th>
                                <th style={{ textAlign: 'right', padding: '12px' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tareasMostradas.map((t) => {
                                const badge = getDueDateBadge(t.fechaVencimiento);
                                const isMine = currentUserId && t.responsableId === currentUserId;

                                return (
                                    <tr
                                        key={t.id}
                                        style={{
                                            borderBottom: '1px solid var(--dashboard-line)',
                                            background: updatingTaskId === t.id ? '#fcfdfd' : '#ffffff',
                                            transition: 'background 0.2s ease',
                                        }}
                                    >
                                        {/* Columna 1: Toggle de Estado */}
                                        <td style={{ textAlign: 'center', padding: '12px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleToggle(t)}
                                                disabled={updatingTaskId === t.id}
                                                title={
                                                    t.completada
                                                        ? 'Marcar como pendiente'
                                                        : isMine
                                                        ? 'Marcar como completada'
                                                        : `Asignada a ${t.responsableNombre || 'otro integrante'}`
                                                }
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: !t.completada && !isMine ? 'not-allowed' : 'pointer',
                                                    opacity: !t.completada && !isMine ? 0.4 : 1,
                                                    padding: 0,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: t.completada ? '#15803d' : '#94a3b8',
                                                }}
                                            >
                                                {t.completada ? (
                                                    <CheckSquare size={20} color="#15803d" />
                                                ) : (
                                                    <Square size={20} color="#94a3b8" />
                                                )}
                                            </button>
                                        </td>

                                        {/* Columna 2: Título y Descripción Detallada */}
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                <strong
                                                    style={{
                                                        fontSize: '14px',
                                                        color: 'var(--dashboard-ink)',
                                                        textDecoration: t.completada ? 'line-through' : 'none',
                                                        opacity: t.completada ? 0.75 : 1,
                                                    }}
                                                >
                                                    {t.titulo}
                                                </strong>
                                                {t.descripcion ? (
                                                    <span style={{ fontSize: '12px', color: 'var(--dashboard-muted)', lineHeight: '1.4' }}>
                                                        {t.descripcion}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                        Sin descripción adicional
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Columna 3: Responsable Asignado (Criterio 4) */}
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <span
                                                    className={`dashboard-badge ${
                                                        isMine ? 'dashboard-badge-admin' : 'dashboard-badge-member'
                                                    }`}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <UserIcon size={12} />
                                                    {t.responsableNombre || 'Integrante'}
                                                    {isMine && ' (Tú)'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Columna 4: Fecha de Vencimiento / Realización y Badge de Estado (Criterio 3) */}
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {t.completada ? (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#15803d' }}>
                                                            <CheckCircle2 size={14} color="#15803d" />
                                                            <span>Realizada: {t.fechaCompletada || t.fechaVencimiento}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--dashboard-muted)' }}>
                                                            <Calendar size={12} />
                                                            <span>Vencía: {t.fechaVencimiento}</span>
                                                        </div>
                                                        <span
                                                            style={{
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                color: '#15803d',
                                                                background: '#f0fdf4',
                                                                border: '1px solid #bbf7d0',
                                                                padding: '2px 8px',
                                                                borderRadius: '12px',
                                                                width: 'fit-content',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                            }}
                                                        >
                                                            <Check size={11} /> Completada
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--dashboard-ink)' }}>
                                                            <Calendar size={14} color="var(--dashboard-green)" />
                                                            <span>{t.fechaVencimiento}</span>
                                                        </div>

                                                        {badge && (
                                                            <span
                                                                style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    padding: '2px 8px',
                                                                    borderRadius: '12px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    width: 'fit-content',
                                                                    background:
                                                                        badge.type === 'vencida'
                                                                            ? '#fef2f2'
                                                                            : badge.type === 'hoy'
                                                                            ? '#fffbeb'
                                                                            : badge.type === 'proxima'
                                                                            ? '#f0fdf4'
                                                                            : '#f8fafc',
                                                                    color:
                                                                        badge.type === 'vencida'
                                                                            ? '#b91c1c'
                                                                            : badge.type === 'hoy'
                                                                            ? '#b45309'
                                                                            : badge.type === 'proxima'
                                                                            ? '#15803d'
                                                                            : '#475569',
                                                                    border:
                                                                        badge.type === 'vencida'
                                                                            ? '1px solid #fecaca'
                                                                            : badge.type === 'hoy'
                                                                            ? '1px solid #fde68a'
                                                                            : badge.type === 'proxima'
                                                                            ? '1px solid #bbf7d0'
                                                                            : '1px solid #e2e8f0',
                                                                }}
                                                            >
                                                                {badge.label}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        {/* Columna 5: Acciones (Editar/Eliminar para Admin y Toggle de Completado) */}
                                        <td style={{ textAlign: 'right', padding: '12px', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                                {esAdministrador && onEditarTask && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onEditarTask(t)}
                                                        disabled={updatingTaskId === t.id}
                                                        title="Editar tarea doméstica"
                                                        style={{
                                                            background: '#fffaf0',
                                                            border: '1px solid #f0d9a6',
                                                            color: '#9a6700',
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                        }}
                                                    >
                                                        <Pencil size={13} /> Editar
                                                    </button>
                                                )}

                                                {esAdministrador && onEliminarTask && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onEliminarTask(t)}
                                                        disabled={updatingTaskId === t.id}
                                                        title="Eliminar tarea doméstica"
                                                        style={{
                                                            background: '#fff5f5',
                                                            border: '1px solid #feb2b2',
                                                            color: '#b91c1c',
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                        }}
                                                    >
                                                        <Trash2 size={13} /> Eliminar
                                                    </button>
                                                )}

                                                {t.completada ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggle(t)}
                                                        disabled={updatingTaskId === t.id}
                                                        title="Reabrir tarea y devolverla al listado de pendientes"
                                                        style={{
                                                            background: '#ffffff',
                                                            color: 'var(--dashboard-green)',
                                                            border: '1px solid var(--dashboard-green)',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                        }}
                                                    >
                                                        Reabrir
                                                    </button>
                                                ) : isMine ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggle(t)}
                                                        disabled={updatingTaskId === t.id}
                                                        style={{
                                                            background: 'var(--dashboard-green)',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                        }}
                                                    >
                                                        <Check size={13} /> Marcar hecha
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggle(t)}
                                                        style={{
                                                            background: 'none',
                                                            color: 'var(--dashboard-muted)',
                                                            border: '1px dashed #cbd5e1',
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            cursor: 'not-allowed',
                                                            opacity: 0.65,
                                                        }}
                                                        title={`Asignada a ${t.responsableNombre || 'otro integrante'}`}
                                                    >
                                                        Solo responsable
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
