import {
    collection,
    deleteDoc,
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

/**
 * Tipos y funciones extensibles según el Principio Abierto/Cerrado (OCP)
 */
export type TaskFilterPredicate = (task: Task) => boolean;
export type TaskSortComparator = (a: Task, b: Task) => number;

export const PREDICADO_TAREAS_PENDIENTES: TaskFilterPredicate = (t) =>
    !t.completada && t.estado !== 'realizada' && t.estado !== 'completada';
export const PREDICADO_TAREAS_COMPLETADAS: TaskFilterPredicate = (t) =>
    Boolean(t.completada || t.estado === 'realizada' || t.estado === 'completada');
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

export const COMPARADOR_FECHA_COMPLETADA_DESC: TaskSortComparator = (a, b) => {
    const timeA = a.fechaCompletada ? new Date(a.fechaCompletada).getTime() : 0;
    const timeB = b.fechaCompletada ? new Date(b.fechaCompletada).getTime() : 0;
    if (timeA === timeB) {
        const dueA = new Date(a.fechaVencimiento).getTime();
        const dueB = new Date(b.fechaVencimiento).getTime();
        return (isNaN(dueB) ? 0 : dueB) - (isNaN(dueA) ? 0 : dueA);
    }
    return timeB - timeA;
};

export const COMPARADOR_FECHA_COMPLETADA_ASC: TaskSortComparator = (a, b) => {
    const timeA = a.fechaCompletada ? new Date(a.fechaCompletada).getTime() : 0;
    const timeB = b.fechaCompletada ? new Date(b.fechaCompletada).getTime() : 0;
    if (timeA === timeB) {
        const dueA = new Date(a.fechaVencimiento).getTime();
        const dueB = new Date(b.fechaVencimiento).getTime();
        return (isNaN(dueA) ? 0 : dueA) - (isNaN(dueB) ? 0 : dueB);
    }
    return timeA - timeB;
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
    orden?: 'fechaVencimientoAsc' | 'fechaVencimientoDesc' | 'fechaCompletadaDesc' | 'fechaCompletadaAsc' | 'titulo';
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

    // 6. Ordenamiento extensible (Criterio 3 y 4)
    if (criterios.comparadorPersonalizado) {
        resultado.sort(criterios.comparadorPersonalizado);
    } else if (criterios.orden === 'fechaCompletadaDesc') {
        resultado.sort(COMPARADOR_FECHA_COMPLETADA_DESC);
    } else if (criterios.orden === 'fechaCompletadaAsc') {
        resultado.sort(COMPARADOR_FECHA_COMPLETADA_ASC);
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
 * HU21: Consultar el historial de tareas completadas de una vivienda.
 * Criterios de Aceptación:
 * 1. El sistema debe mostrar las tareas que hayan sido marcadas como completadas.
 * 2. La información debe corresponder únicamente a tareas de la vivienda.
 * 3. El historial debe permitir identificar la tarea y su estado de completada.
 * 4. El historial debe reflejar las tareas que hayan sido completadas previamente.
 * 5. Las tareas que todavía estén pendientes no deben aparecer como completadas.
 */
export async function obtenerTareasCompletadasPorVivienda(
    viviendaId: string,
    criteriosExtra?: Omit<TaskQueryCriteria, 'estado'>
): Promise<Task[]> {
    if (!viviendaId) return [];
    const todasLasTareas = await obtenerTareasPorVivienda(viviendaId);
    return filtrarYOrdenarTareas(todasLasTareas, {
        ...criteriosExtra,
        estado: 'completadas',
        orden: criteriosExtra?.orden || 'fechaCompletadaDesc',
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

    const taskId = 'tarea-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
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


export interface ActualizarTareaInput {
    tareaId: string;
    viviendaId: string;
    usuarioId: string;
    administradorId: string;
    titulo: string;
    descripcion?: string;
    responsableId: string;
    responsableNombre?: string;
    fechaVencimiento: string;
}

/**
 * Valida los datos requeridos antes de guardar o actualizar una tarea.
 * Lanza un Error con el mensaje descriptivo si los datos no son válidos.
 */
export function validarDatosTarea(datos: {
    viviendaId?: string;
    titulo?: string;
    fechaVencimiento?: string;
    responsableId?: string;
}): void {
    if (!datos.viviendaId || !datos.viviendaId.trim()) {
        throw new Error('Debes pertenecer a una vivienda para gestionar tareas.');
    }
    if (!datos.titulo || !datos.titulo.trim()) {
        throw new Error('El título de la tarea es obligatorio.');
    }
    if (!datos.fechaVencimiento || !datos.fechaVencimiento.trim()) {
        throw new Error('Debes establecer una fecha límite o programada para la tarea.');
    }
    const fecha = new Date(`${datos.fechaVencimiento.trim()}T00:00:00`);
    if (isNaN(fecha.getTime())) {
        throw new Error('La fecha límite o programada no tiene un formato válido.');
    }
    if (!datos.responsableId || !datos.responsableId.trim()) {
        throw new Error('Debes asignar la tarea a un integrante específico de la vivienda.');
    }
}

/**
 * Modificar la información de una tarea existente.
 * Solo el administrador de la vivienda puede ejecutar esta acción.
 */
export async function actualizarTarea(datos: ActualizarTareaInput): Promise<Task> {
    if (!datos.usuarioId || datos.usuarioId !== datos.administradorId) {
        throw new Error('Solo el administrador de la vivienda puede editar las tareas.');
    }

    if (!datos.tareaId || !datos.tareaId.trim()) {
        throw new Error('La tarea seleccionada no es válida.');
    }

    // Validación de datos antes de guardar modificación (Criterio 3)
    validarDatosTarea({
        viviendaId: datos.viviendaId,
        titulo: datos.titulo,
        fechaVencimiento: datos.fechaVencimiento,
        responsableId: datos.responsableId,
    });

    const cleanTitulo = datos.titulo.trim();
    const cleanFecha = datos.fechaVencimiento.trim();
    const cleanDescripcion = datos.descripcion?.trim() || '';
    const cleanResponsableId = datos.responsableId.trim();
    const cleanResponsableNombre = datos.responsableNombre?.trim() || 'Integrante';

    const local = getLocalTasks();
    const idx = local.findIndex((t) => t.id === datos.tareaId);

    const tareaExistente = idx !== -1 ? local[idx] : null;
    const tareaActualizada: Task = {
        ...(tareaExistente || {
            completada: false,
            estado: 'pendiente' as const,
            createdAt: new Date().toISOString(),
        }),
        id: datos.tareaId,
        viviendaId: datos.viviendaId,
        titulo: cleanTitulo,
        descripcion: cleanDescripcion,
        responsableId: cleanResponsableId,
        responsableNombre: cleanResponsableNombre,
        fechaVencimiento: cleanFecha,
    };

    if (idx !== -1) {
        local[idx] = tareaActualizada;
    } else {
        local.push(tareaActualizada);
    }
    saveLocalTasks(local);

    try {
        const docRef = doc(db, 'tasks', datos.tareaId);
        await setDoc(docRef, tareaActualizada, { merge: true });
    } catch (err) {
        console.warn('Aviso al actualizar tarea en Firestore:', err);
    }

    return tareaActualizada;
}

export interface EliminarTareaInput {
    tareaId: string;
    viviendaId: string;
    usuarioId: string;
    administradorId: string;
}

/**
 * Eliminar una tarea cuando sea necesario.
 * Solo el administrador de la vivienda puede ejecutar esta acción.
 */
export async function eliminarTarea(datos: EliminarTareaInput): Promise<void> {
    if (!datos.usuarioId || datos.usuarioId !== datos.administradorId) {
        throw new Error('Solo el administrador de la vivienda puede eliminar tareas.');
    }

    if (!datos.tareaId || !datos.tareaId.trim()) {
        throw new Error('La tarea seleccionada no es válida.');
    }

    const local = getLocalTasks();
    const nuevasTareas = local.filter((t) => t.id !== datos.tareaId);
    saveLocalTasks(nuevasTareas);

    try {
        const docRef = doc(db, 'tasks', datos.tareaId);
        await deleteDoc(docRef);
    } catch (err) {
        console.warn('Aviso al eliminar tarea en Firestore:', err);
    }
}