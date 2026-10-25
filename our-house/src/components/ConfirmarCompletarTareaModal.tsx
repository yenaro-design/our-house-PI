import { useState } from 'react';
import { CheckCircle2, X, Calendar, User as UserIcon, FileText, Loader2, Check } from 'lucide-react';
import type { Task } from '../models/Task';

interface ConfirmarCompletarTareaModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (task: Task) => Promise<void>;
}

function ConfirmarCompletarTareaModal({
    task,
    isOpen,
    onClose,
    onConfirm,
}: ConfirmarCompletarTareaModalProps) {
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !task) return null;

    const handleConfirm = async () => {
        try {
            setSubmitting(true);
            await onConfirm(task);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="dashboard-modal-backdrop"
            onClick={() => {
                if (!submitting) onClose();
            }}
        >
            <div
                className="dashboard-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-task-title"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '480px' }}
            >
                <div className="dashboard-modal-header">
                    <h3 id="confirm-task-title" className="dashboard-modal-title">
                        <CheckCircle2 size={22} color="var(--dashboard-green)" />
                        Confirmar tarea realizada
                    </h3>
                    <button
                        type="button"
                        className="dashboard-modal-close"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Cerrar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    style={{
                        background: '#f8faf5',
                        border: '1px solid #dce8e2',
                        borderRadius: '10px',
                        padding: '16px',
                        marginBottom: '16px',
                    }}
                >
                    <h4
                        style={{
                            margin: '0 0 10px',
                            fontSize: '16px',
                            color: 'var(--dashboard-ink)',
                            fontWeight: 700,
                        }}
                    >
                        {task.titulo}
                    </h4>

                    {task.descripcion && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                fontSize: '13px',
                                color: 'var(--dashboard-muted)',
                                marginBottom: '10px',
                            }}
                        >
                            <FileText size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{task.descripcion}</span>
                        </div>
                    )}

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            fontSize: '12px',
                            color: 'var(--dashboard-muted)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <UserIcon size={14} color="var(--dashboard-green)" />
                            <span>{task.responsableNombre || 'Integrante'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} color="var(--dashboard-green)" />
                            <span>Vence: {task.fechaVencimiento}</span>
                        </div>
                    </div>
                </div>

                <p
                    style={{
                        fontSize: '13px',
                        color: 'var(--dashboard-muted)',
                        margin: '0 0 20px',
                        lineHeight: 1.5,
                    }}
                >
                    ¿Confirmas que has completado esta tarea? Al confirmar, dejará de aparecer entre las tareas pendientes y quedará registrada en el historial de tareas realizadas.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: 'var(--dashboard-ink)',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        style={{
                            background: 'var(--dashboard-green)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                Sí, marcar como completada
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmarCompletarTareaModal;
