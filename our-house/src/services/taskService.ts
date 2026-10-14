import {
    collection,
    doc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
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
                const data = d.data();
                const completada = Boolean(data.completada || data.estado === 'realizada' || data.estado === 'completada');
                const estado = data.estado || (completada ? 'realizada' : 'pendiente');
                remoteTasks.push({ id: d.id, ...data, completada, estado } as Task);
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

export async function obtenerTareasPendientesPorUsuario(
    viviendaId: string,
    userId: string
): Promise<Task[]> {
    const todas = await obtenerTareasPorVivienda(viviendaId);
    return todas.filter((t) => {
        const completada = Boolean(t.completada || t.estado === 'realizada' || t.estado === 'completada');
        return t.responsableId === userId && !completada;
    });
}

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
        estado: 'pendiente',
        createdAt: new Date().toISOString(),
    };

    try {
        const docRef = doc(db, 'tasks', taskId);
        await setDoc(docRef, nuevaTarea);
    } catch (err) {
        console.warn('Aviso al guardar tarea en Firestore:', err);
    }

    const local = getLocalTasks();
    local.push(nuevaTarea);
    saveLocalTasks(local);

    return nuevaTarea;
}

export async function toggleCompletarTarea(taskId: string, completada: boolean): Promise<void> {
    const estado = completada ? 'realizada' : 'pendiente';
    const fechaCompletada = completada ? new Date().toISOString().split('T')[0] : '';
    const local = getLocalTasks();
    const idx = local.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
        local[idx].completada = completada;
        local[idx].estado = estado;
        if (completada) local[idx].fechaCompletada = fechaCompletada;
        saveLocalTasks(local);
    }

    try {
        const docRef = doc(db, 'tasks', taskId);
        await setDoc(
            docRef,
            {
                ...(idx !== -1 ? local[idx] : {}),
                completada,
                estado,
                fechaCompletada,
            },
            { merge: true }
        );
    } catch (err) {
        console.warn('Aviso al actualizar tarea en Firestore:', err);
    }
}

export interface TaskFiltroCriterios {
    estado?: 'pendientes' | 'completadas' | 'todas';
    responsableId?: string;
    soloAsignadasAUsuarioId?: string;
}

export function filtrarTareas(tareas: Task[], criterios: TaskFiltroCriterios): Task[] {
    return tareas.filter((t) => {
        const completada = Boolean(t.completada || t.estado === 'realizada' || t.estado === 'completada');
        if (criterios.estado === 'pendientes' && completada) return false;
        if (criterios.estado === 'completadas' && !completada) return false;
        if (criterios.soloAsignadasAUsuarioId && t.responsableId !== criterios.soloAsignadasAUsuarioId) return false;
        if (criterios.responsableId && criterios.responsableId !== 'todos' && t.responsableId !== criterios.responsableId) return false;
        return true;
    });
}

export async function completarTarea(taskId: string): Promise<Task> {
    const fechaCompletada = new Date().toISOString().split('T')[0];
    const local = getLocalTasks();
    const idx = local.findIndex((t) => t.id === taskId);
    let tareaActualizada: Task;

    if (idx !== -1) {
        local[idx].completada = true;
        local[idx].estado = 'realizada';
        local[idx].fechaCompletada = fechaCompletada;
        tareaActualizada = { ...local[idx] };
        saveLocalTasks(local);
    } else {
        tareaActualizada = {
            id: taskId,
            viviendaId: '',
            titulo: '',
            responsableId: '',
            fechaVencimiento: '',
            completada: true,
            estado: 'realizada',
            fechaCompletada,
        };
    }

    const docRef = doc(db, 'tasks', taskId);
    try {
        await updateDoc(docRef, {
            completada: true,
            estado: 'realizada',
            fechaCompletada,
        });
    } catch (err: unknown) {
        const code =
            typeof err === 'object' && err !== null && 'code' in err
                ? String((err as { code?: unknown }).code)
                : '';
        const isPermission =
            code === 'permission-denied' ||
            (err instanceof Error && err.message.includes('permissions'));

        if (isPermission) {
            await updateDoc(docRef, { completada: true });
        } else if (code === 'not-found') {
            await setDoc(
                docRef,
                {
                    ...(idx !== -1 ? local[idx] : {}),
                    completada: true,
                    estado: 'realizada',
                    fechaCompletada,
                },
                { merge: true }
            );
        } else {
            throw err;
        }
    }

    return tareaActualizada;
}

