import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    Pencil,
    CheckCircle2,
    AlertCircle,
    Calendar,
    User as UserIcon,
    FileText,
    Loader2,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { actualizarTarea, validarDatosTarea } from '../services/taskService';
import type { Task } from '../models/Task';
import type { User } from '../models/User';

interface EditarTareaModalProps {
    isOpen: boolean;
    task: Task | null;
    administradorId: string;
    members: User[];
    onClose: () => void;
    onTaskUpdated: (updatedTask: Task) => void;
}

export default function EditarTareaModal({
    isOpen,
    task,
    administradorId,
    members,
    onClose,
    onTaskUpdated,
}: EditarTareaModalProps) {
    if (!isOpen || !task) return null;

    return (
        <EditarTareaModalContent
            key={task.id}
            task={task}
            administradorId={administradorId}
            members={members}
            onClose={onClose}
            onTaskUpdated={onTaskUpdated}
        />
    );
}

interface EditarTareaModalContentProps {
    task: Task;
    administradorId: string;
    members: User[];
    onClose: () => void;
    onTaskUpdated: (updatedTask: Task) => void;
}

function EditarTareaModalContent({
    task,
    administradorId,
    members,
    onClose,
    onTaskUpdated,
}: EditarTareaModalContentProps) {
    const { user } = useAuth();

    const [titulo, setTitulo] = useState(task.titulo || '');
    const [descripcion, setDescripcion] = useState(task.descripcion || '');
    const [fechaVencimiento, setFechaVencimiento] = useState(task.fechaVencimiento || '');
    const [responsableId, setResponsableId] = useState(task.responsableId || '');

    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!user) {
            setError('Debes iniciar sesión para editar tareas.');
            return;
        }

        if (user.uid !== administradorId) {
            setError('Solo el administrador de la vivienda puede editar las tareas.');
            return;
        }

        const tituloLimpio = titulo.trim();
        const fechaLimpia = fechaVencimiento.trim();
        const responsableLimpio = responsableId.trim();

        // Criterio 3: El sistema debe validar los datos antes de guardar una modificación
        try {
            validarDatosTarea({
                viviendaId: task.viviendaId,
                titulo: tituloLimpio,
                fechaVencimiento: fechaLimpia,
                responsableId: responsableLimpio,
            });
        } catch (valErr: unknown) {
            setError(valErr instanceof Error ? valErr.message : 'Datos inválidos.');
            return;
        }

        const responsableSeleccionado = members.find((m) => m.id === responsableLimpio);
        const responsableNombre = responsableSeleccionado?.nombre || task.responsableNombre || 'Integrante';

        try {
            setGuardando(true);
            const tareaActualizada = await actualizarTarea({
                tareaId: task.id,
                viviendaId: task.viviendaId,
                usuarioId: user.uid,
                administradorId,
                titulo: tituloLimpio,
                descripcion: descripcion.trim(),
                responsableId: responsableLimpio,
                responsableNombre,
                fechaVencimiento: fechaLimpia,
            });

            onTaskUpdated(tareaActualizada);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al actualizar la tarea.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div
            className="dashboard-modal-backdrop"
            onClick={() => {
                if (!guardando) onClose();
            }}
        >
            <div
                className="dashboard-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="editar-tarea-title"
                style={{ maxWidth: '520px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="dashboard-modal-header">
                    <h3 id="editar-tarea-title" className="dashboard-modal-title">
                        <Pencil size={20} color="var(--dashboard-green)" />
                        Editar tarea doméstica
                    </h3>
                    <button
                        type="button"
                        className="dashboard-modal-close"
                        onClick={onClose}
                        disabled={guardando}
                        aria-label="Cerrar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>
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

                    {/* Título de la tarea */}
                    <div>
                        <label
                            htmlFor="edit-task-title-input"
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
                            id="edit-task-title-input"
                            type="text"
                            value={titulo}
                            onChange={(e) => {
                                setTitulo(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="Ej: Limpiar estufa y horno"
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
                    </div>

                    {/* Descripción de la tarea */}
                    <div>
                        <label
                            htmlFor="edit-task-description-input"
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
                            id="edit-task-description-input"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Instrucciones, detalles o recomendaciones de la tarea..."
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
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                        {/* Fecha programada / límite */}
                        <div>
                            <label
                                htmlFor="edit-task-due-date-input"
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
                                Fecha límite *
                            </label>
                            <input
                                id="edit-task-due-date-input"
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
                        </div>

                        {/* Integrante responsable */}
                        <div>
                            <label
                                htmlFor="edit-task-assignee-select"
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
                                id="edit-task-assignee-select"
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
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={guardando}
                            style={{
                                background: '#ffffff',
                                color: '#55665e',
                                border: '1px solid #d9e1d9',
                                padding: '10px 18px',
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
                            disabled={guardando}
                            style={{
                                background: '#356b59',
                                color: '#ffffff',
                                border: 'none',
                                padding: '10px 20px',
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
                                    <Loader2 size={16} className="animate-spin" /> Guardando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} /> Guardar cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
