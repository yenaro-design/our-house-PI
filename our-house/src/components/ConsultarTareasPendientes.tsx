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

export interface ConsultarTareasPendientesProps {
    viviendaId: string;
    viviendaNombre?: string;
    currentUserId?: string;
    members?: User[];
    tasks: Task[];
    onToggleTask: (taskId: string, current: boolean) => Promise<void>;
    onOpenCrearTareaModal?: () => void;
    // Puntos de extensión para Principio Abierto/Cerrado (OCP)
    customFilter?: TaskFilterPredicate;
    customSort?: TaskSortComparator;
    showFilters?: boolean;
}

export default function ConsultarTareasPendientes({
    viviendaId,
    viviendaNombre,
    currentUserId,
    members = [],
    tasks,
    onToggleTask,
    onOpenCrearTareaModal,
    customFilter,
    customSort,
    showFilters = true,
}: ConsultarTareasPendientesProps) {
    // Estado de filtros extensibles
    const [busqueda, setBusqueda] = useState('');
    const [filtroResponsable, setFiltroResponsable] = useState<string>('todos');
    const [orden, setOrden] = useState<'fechaVencimientoAsc' | 'fechaVencimientoDesc'>('fechaVencimientoAsc');
    const [vistaActiva, setVistaActiva] = useState<'pendientes' | 'completadas'>('pendientes');
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [mensajeFeedback, setMensajeFeedback] = useState<string | null>(null);

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
    // Si la vista es 'pendientes', Criterios 1, 3, 4 y 5 se cumplen estrictamente:
    // - Solo tareas pendientes (!t.completada)
    // - Las completadas NO aparecen en el listado de pendientes (Criterio 5)
    // - Organizadas por fecha de vencimiento (Criterio 3)
    const tareasMostradas = useMemo(() => {
        return filtrarYOrdenarTareas(tareasVivienda, {
            estado: vistaActiva, // 'pendientes' o 'completadas'
            responsableId: filtroResponsable,
            busqueda,
            orden,
            filtroPersonalizado: customFilter,
            comparadorPersonalizado: customSort,
        });
    }, [tareasVivienda, vistaActiva, filtroResponsable, busqueda, orden, customFilter, customSort]);

    const handleToggle = async (t: Task) => {
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
                        Tareas del Hogar {viviendaNombre ? `· ${viviendaNombre}` : ''}
                    </h2>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--dashboard-muted)' }}>
                        Consulta las actividades pendientes ordenadas por fecha de vencimiento y responsable asignado.
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

            {/* Tarjetas de Resumen Rápido (Estilo Dashboard) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                }}
            >
                <div
                    onClick={() => setVistaActiva('pendientes')}
                    style={{
                        background: vistaActiva === 'pendientes' ? '#f4f8f6' : '#ffffff',
                        border: vistaActiva === 'pendientes' ? '1.5px solid var(--dashboard-green)' : '1px solid var(--dashboard-line)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--dashboard-muted)' }}>
                            Tareas Pendientes
                        </span>
                        <Clock size={16} color="var(--dashboard-green)" />
                    </div>
                    <strong style={{ fontSize: '24px', color: 'var(--dashboard-ink)' }}>{totalPendientes}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dashboard-muted)' }}>
                        Por realizar en el hogar
                    </p>
                </div>

                <div
                    onClick={() => {
                        setVistaActiva('pendientes');
                        if (currentUserId) setFiltroResponsable(currentUserId);
                    }}
                    style={{
                        background: '#ffffff',
                        border: '1px solid var(--dashboard-line)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--dashboard-muted)' }}>
                            Asignadas a Mí
                        </span>
                        <UserIcon size={16} color="var(--dashboard-green)" />
                    </div>
                    <strong style={{ fontSize: '24px', color: 'var(--dashboard-ink)' }}>{misPendientesCount}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dashboard-muted)' }}>
                        Bajo tu responsabilidad
                    </p>
                </div>

                {vencidasCount > 0 && (
                    <div
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            padding: '14px 16px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#b91c1c' }}>
                                Tareas Vencidas
                            </span>
                            <AlertTriangle size={16} color="#b91c1c" />
                        </div>
                        <strong style={{ fontSize: '24px', color: '#b91c1c' }}>{vencidasCount}</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b91c1c' }}>
                            Requieren atención prioritaria
                        </p>
                    </div>
                )}

                <div
                    onClick={() => setVistaActiva('completadas')}
                    style={{
                        background: vistaActiva === 'completadas' ? '#f4f8f6' : '#ffffff',
                        border: vistaActiva === 'completadas' ? '1.5px solid var(--dashboard-green)' : '1px solid var(--dashboard-line)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--dashboard-muted)' }}>
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
                    {/* Selector de Estado: Pendientes (defecto) vs Historial */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setVistaActiva('pendientes')}
                            style={{
                                background: vistaActiva === 'pendientes' ? 'var(--dashboard-green)' : '#f4f8f6',
                                color: vistaActiva === 'pendientes' ? '#ffffff' : 'var(--dashboard-ink)',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <Clock size={14} />
                            Pendientes ({totalPendientes})
                        </button>
                        <button
                            type="button"
                            onClick={() => setVistaActiva('completadas')}
                            style={{
                                background: vistaActiva === 'completadas' ? 'var(--dashboard-green)' : '#f4f8f6',
                                color: vistaActiva === 'completadas' ? '#ffffff' : 'var(--dashboard-ink)',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <CheckSquare size={14} />
                            Completadas ({totalCompletadas})
                        </button>
                    </div>

                    {/* Orden por Fecha de Vencimiento (Criterio 3) */}
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
                            onChange={(e) => setOrden(e.target.value as 'fechaVencimientoAsc' | 'fechaVencimientoDesc')}
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
                            <option value="fechaVencimientoAsc">Fecha de vencimiento (Más próximas primero)</option>
                            <option value="fechaVencimientoDesc">Fecha de vencimiento (Más lejanas primero)</option>
                        </select>
                    </div>
                </div>

                {/* Filtros OCP de Búsqueda y Responsable (Criterio 4) */}
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
                                placeholder="Buscar por labor o descripción..."
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
                            background: '#f4f8f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px',
                            color: 'var(--dashboard-green)',
                        }}
                    >
                        <CheckSquare size={24} />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--dashboard-ink)' }}>
                        {vistaActiva === 'pendientes'
                            ? 'No hay tareas pendientes en este momento'
                            : 'No hay tareas completadas registradas'}
                    </h3>
                    <p style={{ margin: '0 0 16px', fontSize: '14px', maxWidth: '420px', marginInline: 'auto' }}>
                        {vistaActiva === 'pendientes'
                            ? 'Todas las responsabilidades del hogar están al día. Puedes registrar una nueva tarea cuando sea necesario.'
                            : 'Las tareas que vayas completando en la vivienda se archivarán aquí para consulta histórica.'}
                    </p>
                    {vistaActiva === 'pendientes' && onOpenCrearTareaModal && (
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
                                <th style={{ textAlign: 'left', padding: '12px' }}>Fecha de Vencimiento</th>
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
                                                title={t.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
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
                                                        opacity: t.completada ? 0.65 : 1,
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

                                        {/* Columna 4: Fecha de Vencimiento y Badge Relativo (Criterio 3) */}
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--dashboard-ink)' }}>
                                                    <Calendar size={14} color="var(--dashboard-green)" />
                                                    <span>{t.fechaVencimiento}</span>
                                                </div>

                                                {!t.completada && badge && (
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

                                                {t.completada && (
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
                                                        }}
                                                    >
                                                        Completada
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Columna 5: Botón Rápido de Acción */}
                                        <td style={{ textAlign: 'right', padding: '12px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleToggle(t)}
                                                disabled={updatingTaskId === t.id}
                                                style={{
                                                    background: t.completada ? '#ffffff' : 'var(--dashboard-green)',
                                                    color: t.completada ? 'var(--dashboard-green)' : '#ffffff',
                                                    border: t.completada ? '1px solid var(--dashboard-green)' : 'none',
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
                                                {t.completada ? (
                                                    <>Reabrir</>
                                                ) : (
                                                    <>
                                                        <Check size={13} /> Marcar hecha
                                                    </>
                                                )}
                                            </button>
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
