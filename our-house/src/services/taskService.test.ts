import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../models/Task';

const firestore = vi.hoisted(() => ({
  collection: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(), getDocs: vi.fn(), query: vi.fn(),
  setDoc: vi.fn(), updateDoc: vi.fn(), where: vi.fn(),
}));
vi.mock('firebase/firestore', () => firestore);
vi.mock('../firebase/config', () => ({ db: {} }));

import {
  actualizarTarea, crearTarea, eliminarTarea, filtrarTareas, filtrarYOrdenarTareas,
  getDueDateBadge, obtenerTareasPendientesPorUsuario, obtenerTareasPorVivienda,
  completarTarea, toggleCompletarTarea, validarDatosTarea,
} from './taskService';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't-1', viviendaId: 'v-1', titulo: 'Comprar pan', descripcion: 'Para la cena',
  responsableId: 'ana', responsableNombre: 'Ana', fechaVencimiento: '2026-03-10',
  completada: false, estado: 'pendiente', createdAt: '2026-03-01', ...overrides,
});

describe('taskService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    firestore.doc.mockReturnValue('task-ref');
    firestore.collection.mockReturnValue('tasks');
    firestore.query.mockReturnValue('query');
    firestore.where.mockReturnValue('where');
  });

  it('filtra por estado, responsable, texto, fechas y orden personalizado', () => {
    const tareas = [task(), task({ id: 't-2', titulo: 'Limpiar cocina', descripcion: '', responsableId: 'bruno', fechaVencimiento: '2026-03-05', completada: true, estado: 'realizada' })];
    expect(filtrarTareas(tareas, { estado: 'pendientes', responsableId: 'ana' })).toHaveLength(1);
    expect(filtrarTareas(tareas, { estado: 'completadas' })[0].id).toBe('t-2');
    expect(filtrarYOrdenarTareas(tareas, { busqueda: 'cena', fechaDesde: '2026-03-01', fechaHasta: '2026-03-20' })[0].id).toBe('t-1');
    expect(filtrarYOrdenarTareas(tareas, { orden: 'titulo' }).map((t) => t.id)).toEqual(['t-1', 't-2']);
    expect(filtrarYOrdenarTareas(tareas, { comparadorPersonalizado: (a, b) => b.id.localeCompare(a.id) }).map((t) => t.id)).toEqual(['t-2', 't-1']);
  });

  it('valida y crea tareas normalizadas, y permite completar localmente', async () => {
    expect(() => validarDatosTarea({ viviendaId: 'v', titulo: 'T', fechaVencimiento: 'invalid', responsableId: 'u' })).toThrow('formato válido');
    await expect(crearTarea({ viviendaId: '', titulo: 'x', responsableId: 'u', fechaVencimiento: '2026-01-01' })).rejects.toThrow('pertenecer');
    const created = await crearTarea({ viviendaId: 'v-1', titulo: '  Comprar  ', descripcion: '  pan ', responsableId: 'ana', fechaVencimiento: '2026-03-02' });
    expect(created).toMatchObject({ titulo: 'Comprar', descripcion: 'pan', completada: false, estado: 'pendiente' });
    expect(JSON.parse(localStorage.getItem('our_house_tasks')!)).toHaveLength(1);
    await toggleCompletarTarea(created.id, true);
    expect(JSON.parse(localStorage.getItem('our_house_tasks')!)[0]).toMatchObject({ completada: true, estado: 'realizada' });
  });

  it('actualiza y elimina tareas solo para administrador', async () => {
    localStorage.setItem('our_house_tasks', JSON.stringify([task()]));
    await expect(actualizarTarea({ tareaId: 't-1', viviendaId: 'v-1', usuarioId: 'ana', administradorId: 'bruno', titulo: 'x', responsableId: 'ana', fechaVencimiento: '2026-03-03' })).rejects.toThrow('administrador');
    const updated = await actualizarTarea({ tareaId: 't-1', viviendaId: 'v-1', usuarioId: 'ana', administradorId: 'ana', titulo: '  Nuevo ', descripcion: ' desc ', responsableId: 'bruno', fechaVencimiento: '2026-03-03' });
    expect(updated).toMatchObject({ titulo: 'Nuevo', responsableId: 'bruno', descripcion: 'desc' });
    await eliminarTarea({ tareaId: 't-1', viviendaId: 'v-1', usuarioId: 'ana', administradorId: 'ana' });
    expect(JSON.parse(localStorage.getItem('our_house_tasks')!)).toEqual([]);
    expect(firestore.deleteDoc).toHaveBeenCalled();
  });

  it('conserva cambios locales aunque fallen las escrituras remotas y valida id de eliminación', async () => {
    firestore.setDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(actualizarTarea({ tareaId: 'new-task', viviendaId: 'v-1', usuarioId: 'ana', administradorId: 'ana', titulo: 'Nueva', responsableId: 'ana', fechaVencimiento: '2026-03-03' })).resolves.toMatchObject({ id: 'new-task' });
    await expect(eliminarTarea({ tareaId: '', viviendaId: 'v-1', usuarioId: 'ana', administradorId: 'ana' })).rejects.toThrow('no es válida');
    firestore.deleteDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(eliminarTarea({ tareaId: 'new-task', viviendaId: 'v-1', usuarioId: 'ana', administradorId: 'ana' })).resolves.toBeUndefined();
  });

  it('calcula etiquetas de vencimiento para casos límite', () => {
    expect(getDueDateBadge('')).toEqual({ label: 'Sin fecha', type: 'futura', diffDays: 0 });
    expect(getDueDateBadge('not-a-date').type).toBe('futura');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);
    expect(getDueDateBadge(date)).toMatchObject({ type: 'proxima', diffDays: 1, label: 'Vence mañana' });
  });

  it('combina tareas remotas y locales, normaliza estado y filtra pendientes del usuario', async () => {
    localStorage.setItem('our_house_tasks', JSON.stringify([task({ id: 'local', fechaVencimiento: '2026-03-01' })]));
    firestore.getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (cb: (doc: { id: string; data: () => Partial<Task> }) => void) =>
        cb({ id: 'remote', data: () => ({ ...task(), estado: 'completada', completada: false }) }),
    });
    const all = await obtenerTareasPorVivienda('v-1');
    expect(all.map((t) => t.id)).toEqual(['local', 't-1']);
    expect(all[1]).toMatchObject({ completada: true, estado: 'completada' });
    firestore.getDocs.mockRejectedValueOnce(new Error('offline'));
    await expect(obtenerTareasPendientesPorUsuario('v-1', 'ana')).resolves.toHaveLength(1);
  });

  it('conserva una edición local más reciente que la copia remota al recargar', async () => {
    const updatedAt = '2026-03-05T12:00:00.000Z';
    localStorage.setItem('our_house_tasks', JSON.stringify([
      task({ titulo: 'Comprar pan actualizado', updatedAt }),
    ]));
    firestore.getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (cb: (doc: { id: string; data: () => Partial<Task> }) => void) =>
        cb({
          id: 't-1',
          data: () => ({ ...task(), titulo: 'Comprar pan antiguo' }),
        }),
    });

    const tareas = await obtenerTareasPorVivienda('v-1');

    expect(tareas.find((t) => t.id === 't-1')?.titulo).toBe('Comprar pan actualizado');
  });

  it('completa una tarea existente y crea un documento cuando Firestore reporta not-found', async () => {
    localStorage.setItem('our_house_tasks', JSON.stringify([task()]));
    firestore.updateDoc.mockResolvedValueOnce(undefined);
    await completarTarea('t-1');
    expect(JSON.parse(localStorage.getItem('our_house_tasks')!)[0]).toMatchObject({ completada: true, estado: 'realizada' });

    firestore.updateDoc.mockRejectedValueOnce({ code: 'not-found' });
    await completarTarea('missing');
    expect(firestore.setDoc).toHaveBeenCalled();
  });

  it('reintenta actualizaciones por permisos y propaga errores desconocidos', async () => {
    firestore.updateDoc.mockRejectedValueOnce({ code: 'permission-denied' }).mockResolvedValueOnce(undefined);
    await completarTarea('missing-permission');
    expect(firestore.updateDoc).toHaveBeenCalledTimes(2);
    firestore.updateDoc.mockRejectedValueOnce(new Error('unexpected'));
    await expect(completarTarea('missing-error')).rejects.toThrow('unexpected');
  });

  it('maneja comparadores de fechas inválidas y permisos de actualización', () => {
    const invalid = [task({ id: 'a', fechaVencimiento: 'bad', titulo: 'B' }), task({ id: 'b', fechaVencimiento: 'also-bad', titulo: 'A' })];
    expect(filtrarYOrdenarTareas(invalid, { orden: 'fechaVencimientoDesc' })).toHaveLength(2);
    expect(filtrarYOrdenarTareas(invalid, { orden: 'fechaCompletadaAsc' })).toHaveLength(2);
    expect(filtrarYOrdenarTareas(invalid, { filtroPersonalizado: (t) => t.titulo === 'A' })).toHaveLength(1);
  });
});
