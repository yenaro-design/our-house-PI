import {
    collection,
    doc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db, isFirebasePersistenceAvailable } from '../firebase/config';
import type { Task } from '../models/Task';

const TASKS_STORAGE_KEY = 'our_house_tasks';

function getLocalTasks(): Task[] {
    try {
        const raw = localStorage.getItem(TASKS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Error al leer tareas locales:', e);
    }
    return [];
}

function saveLocalTasks(tasks: Task[]) {
    try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('our_house:tasks_change'));
        }
    } catch (e) {
        console.warn('Error al guardar tareas locales:', e);
    }
}

/**
 * Obtener tareas de una vivienda
 */
export async function obtenerTareasPorVivienda(viviendaId: string): Promise<Task[]> {
    if (!viviendaId) return [];

    try {
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, where('viviendaId', '==', viviendaId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const remoteTasks: Task[] = [];
            snapshot.forEach((d) => {
                remoteTasks.push({ id: d.id, ...d.data() } as Task);
            });
            const local = getLocalTasks().filter((t) => t.viviendaId === viviendaId);
            const map = new Map<string, Task>();
            remoteTasks.forEach((t) => map.set(t.id, t));
            local.forEach((t) => {
                if (!map.has(t.id)) map.set(t.id, t);
            });
            return Array.from(map.values()).sort(
                (a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
            );
        }
    } catch (err) {
        console.warn('Aviso al obtener tareas en Firestore:', err);
    }

    const local = getLocalTasks().filter((t) => t.viviendaId === viviendaId);
    return local.sort(
        (a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    );
}

/**
 * HU09 — Obtener tareas pendientes por usuario para validación de salida voluntaria
 */
export async function obtenerTareasPendientesPorUsuario(
    viviendaId: string,
    userId: string
): Promise<Task[]> {
    const todas = await obtenerTareasPorVivienda(viviendaId);
    return todas.filter((t) => t.responsableId === userId && !t.completada);
}

/**
 * Crear nueva tarea doméstica
 */
export async function crearTarea(datos: {
    viviendaId: string;
    titulo: string;
    descripcion?: string;
    responsableId: string;
    responsableNombre?: string;
    fechaVencimiento: string;
}): Promise<Task> {
    if (!datos.viviendaId) {
        throw new Error('Debes pertenecer a una vivienda para crear y asignar tareas.');
    }

    const cleanTitulo = datos.titulo?.trim();
    if (!cleanTitulo) {
        throw new Error('El título de la tarea es obligatorio.');
    }

    const cleanFecha = datos.fechaVencimiento?.trim();
    if (!cleanFecha) {
        throw new Error('Debes establecer una fecha límite o programada para la tarea.');
    }

    if (!datos.responsableId?.trim()) {
        throw new Error('Debes asignar la tarea a un integrante específico de la vivienda.');
    }

    const taskId = 'tarea-' + Date.now();
    const nuevaTarea: Task = {
        id: taskId,
        viviendaId: datos.viviendaId,
        titulo: cleanTitulo,
        descripcion: datos.descripcion?.trim() || '',
        responsableId: datos.responsableId.trim(),
        responsableNombre: datos.responsableNombre || 'Integrante',
        fechaVencimiento: cleanFecha,
        completada: false,
        createdAt: new Date().toISOString(),
    };

    if (isFirebasePersistenceAvailable()) {
        const docRef = doc(db, 'tasks', taskId);
        await setDoc(docRef, nuevaTarea);
    }

    const local = getLocalTasks();
    local.push(nuevaTarea);
    saveLocalTasks(local);

    return nuevaTarea;
}

/**
 * Marcar tarea como completada o pendiente
 */
export async function toggleCompletarTarea(taskId: string, completada: boolean): Promise<void> {
    const local = getLocalTasks();
    const idx = local.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
        local[idx].completada = completada;
        saveLocalTasks(local);
    }

    try {
        const docRef = doc(db, 'tasks', taskId);
        await updateDoc(docRef, { completada });
    } catch (err) {
        console.warn('Aviso al actualizar tarea en Firestore:', err);
    }
}
