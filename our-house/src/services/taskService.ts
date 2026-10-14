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
 * Tipos y funciones extensibles según el Principio Abierto/Cerrado (OCP)
 */
export type TaskFilterPredicate = (task: Task) => boolean;
export type TaskSortComparator = (a: Task, b: Task) => number;

export const PREDICADO_TAREAS_PENDIENTES: TaskFilterPredicate = (t) => !t.completada;
export const PREDICADO_TAREAS_COMPLETADAS: TaskFilterPredicate = (t) => t.completada;
export const PREDICADO_TAREAS_TODAS: TaskFilterPredicate = () => true;

export const COMPARADOR_FECHA_VENCIMIENTO_ASC: TaskSortComparator = (a, b) => {
    const timeA = new Date(a.fechaVencimiento).getTime();
    const timeB = new Date(b.fechaVencimiento).getTime();
    if (isNaN(timeA) || isNaN(timeB)) {
        return (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || '');
    }
    if (timeA === timeB) {
        return a.titulo.localeCompare(b.titulo);
    }
    return timeA - timeB;
};

export const COMPARADOR_FECHA_VENCIMIENTO_DESC: TaskSortComparator = (a, b) => {
    const timeA = new Date(a.fechaVencimiento).getTime();
    const timeB = new Date(b.fechaVencimiento).getTime();
    if (isNaN(timeA) || isNaN(timeB)) {
        return (b.fechaVencimiento || '').localeCompare(a.fechaVencimiento || '');
    }
    if (timeA === timeB) {
        return a.titulo.localeCompare(b.titulo);
    }
    return timeB - timeA;
};

export const COMPARADOR_TITULO_ASC: TaskSortComparator = (a, b) =>
    a.titulo.localeCompare(b.titulo);

export interface TaskQueryCriteria {
    estado?: 'pendientes' | 'completadas' | 'todas';
    responsableId?: string;
    busqueda?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    filtroPersonalizado?: TaskFilterPredicate;
    orden?: 'fechaVencimientoAsc' | 'fechaVencimientoDesc' | 'titulo';
    comparadorPersonalizado?: TaskSortComparator;
}

/**
 * Filtra y ordena tareas aplicando el Principio Abierto/Cerrado (OCP).
 * Permite extender filtros y comparadores sin modificar la lógica interna.
 */
export function filtrarYOrdenarTareas(
    tareas: Task[],
    criterios?: TaskQueryCriteria
): Task[] {
    if (!criterios) {
        return [...tareas].sort(COMPARADOR_FECHA_VENCIMIENTO_ASC);
    }

    let resultado = [...tareas];

    // 1. Filtrado por estado (Criterio 1 y 5)
    if (criterios.estado === 'pendientes') {
        resultado = resultado.filter(PREDICADO_TAREAS_PENDIENTES);
    } else if (criterios.estado === 'completadas') {
        resultado = resultado.filter(PREDICADO_TAREAS_COMPLETADAS);
    }

    // 2. Filtrado por responsable asignado (Criterio 4)
    if (criterios.responsableId && criterios.responsableId !== 'todos') {
        resultado = resultado.filter((t) => t.responsableId === criterios.responsableId);
    }

    // 3. Filtrado por búsqueda de texto
    if (criterios.busqueda && criterios.busqueda.trim()) {
        const queryNorm = criterios.busqueda.toLowerCase().trim();
        resultado = resultado.filter(
            (t) =>
                t.titulo.toLowerCase().includes(queryNorm) ||
                (t.descripcion && t.descripcion.toLowerCase().includes(queryNorm)) ||
                (t.responsableNombre && t.responsableNombre.toLowerCase().includes(queryNorm))
        );
    }

    // 4. Filtrado por rango de fechas
    if (criterios.fechaDesde) {
        resultado = resultado.filter((t) => t.fechaVencimiento >= criterios.fechaDesde!);
    }
    if (criterios.fechaHasta) {
        resultado = resultado.filter((t) => t.fechaVencimiento <= criterios.fechaHasta!);
    }

    // 5. Filtro personalizado inyectable (OCP)
    if (criterios.filtroPersonalizado) {
        resultado = resultado.filter(criterios.filtroPersonalizado);
    }

    // 6. Ordenamiento extensible (Criterio 3)
    if (criterios.comparadorPersonalizado) {
        resultado.sort(criterios.comparadorPersonalizado);
    } else if (criterios.orden === 'fechaVencimientoDesc') {
        resultado.sort(COMPARADOR_FECHA_VENCIMIENTO_DESC);
    } else if (criterios.orden === 'titulo') {
        resultado.sort(COMPARADOR_TITULO_ASC);
    } else {
        resultado.sort(COMPARADOR_FECHA_VENCIMIENTO_ASC);
    }

    return resultado;
}

/**
 * HU: Consultar tareas pendientes de una vivienda organizadas por fecha de vencimiento.
 * Criterios de Aceptación:
 * 1. Muestra tareas pendientes (!completada).
 * 2. Restringido a la vivienda del usuario.
 * 3. Organizadas por fecha de vencimiento (ascendente por defecto).
 * 4. Permite identificar el responsable asignado.
 * 5. Las tareas completadas no aparecen.
 */
export async function obtenerTareasPendientesPorVivienda(
    viviendaId: string,
    criteriosExtra?: Omit<TaskQueryCriteria, 'estado'>
): Promise<Task[]> {
    if (!viviendaId) return [];
    const todasLasTareas = await obtenerTareasPorVivienda(viviendaId);
    return filtrarYOrdenarTareas(todasLasTareas, {
        ...criteriosExtra,
        estado: 'pendientes',
        orden: criteriosExtra?.orden || 'fechaVencimientoAsc',
    });
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

export interface DueDateBadgeInfo {
    label: string;
    type: 'vencida' | 'hoy' | 'proxima' | 'futura';
    diffDays: number;
}

/**
 * Calcula el estado de vencimiento relativo de una tarea para su visualización.
 */
export function getDueDateBadge(fechaVencimientoStr: string): DueDateBadgeInfo {
    if (!fechaVencimientoStr) return { label: 'Sin fecha', type: 'futura', diffDays: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(`${fechaVencimientoStr}T00:00:00`);
    if (isNaN(dueDate.getTime())) {
        return { label: fechaVencimientoStr, type: 'futura', diffDays: 0 };
    }
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        const diasAtras = Math.abs(diffDays);
        return {
            label: `Vencida (${diasAtras} ${diasAtras === 1 ? 'día' : 'días'})`,
            type: 'vencida',
            diffDays,
        };
    } else if (diffDays === 0) {
        return {
            label: 'Vence hoy',
            type: 'hoy',
            diffDays,
        };
    } else if (diffDays === 1) {
        return {
            label: 'Vence mañana',
            type: 'proxima',
            diffDays,
        };
    } else if (diffDays <= 7) {
        return {
            label: `En ${diffDays} días`,
            type: 'proxima',
            diffDays,
        };
    } else {
        return {
            label: fechaVencimientoStr,
            type: 'futura',
            diffDays,
        };
    }
}

