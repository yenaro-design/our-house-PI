import { useState } from 'react';
import { Trash2, AlertCircle, X, Loader2 } from 'lucide-react';
import type { Task } from '../models/Task';

interface ConfirmarEliminarTareaModalProps {
    isOpen: boolean;
    task: Task | null;
    onClose: () => void;
    onConfirm: (task: Task) => Promise<void>;
}

export default function ConfirmarEliminarTareaModal({
    isOpen,
    task,
    onClose,
    onConfirm,
}: ConfirmarEliminarTareaModalProps) {
    const [eliminando, setEliminando] = useState(false);

    if (!isOpen || !task) return null;

    const handleConfirm = async () => {
        try {
            setEliminando(true);
            await onConfirm(task);
            onClose();
        } finally {
            setEliminando(false);
        }
    };

    return (
        <div
            className="dashboard-modal-backdrop"
            onClick={() => {
                if (!eliminando) onClose();
            }}
        >
            <div
                className="dashboard-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-task-title"
                style={{ maxWidth: '460px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="dashboard-modal-header">
                    <h3 id="delete-task-title" className="dashboard-modal-title">
                        <Trash2 size={20} color="#b91c1c" />
                        Confirmar eliminación de tarea
                    </h3>
                    <button
                        type="button"
                        className="dashboard-modal-close"
                        onClick={onClose}
                        disabled={eliminando}
                        aria-label="Cerrar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '14px',
                        background: '#fff5f5',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        color: '#7f1d1d',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        marginBottom: '16px',
                    }}
                >
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        ¿Estás seguro de que deseas eliminar la tarea <strong>"{task.titulo}"</strong>?
                        {task.responsableNombre && (
                            <span style={{ display: 'block', marginTop: '4px', color: '#991b1b', fontSize: '12px' }}>
                                Asignada a: <strong>{task.responsableNombre}</strong> (Vencimiento: {task.fechaVencimiento})
                            </span>
                        )}
                        <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', fontWeight: 600 }}>
                            Esta acción no se puede deshacer y retirará la tarea de la planificación.
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={eliminando}
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
                        type="button"
                        onClick={handleConfirm}
                        disabled={eliminando}
                        style={{
                            background: '#b91c1c',
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
                        {eliminando ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Eliminando...
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} /> Eliminar tarea
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
