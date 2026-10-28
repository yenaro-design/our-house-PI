import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal<typeof import('firebase/firestore')>();
    return {
        ...actual,
        collection: vi.fn(),
        doc: vi.fn(),
        getDocs: vi.fn().mockResolvedValue({ empty: true }),
        query: vi.fn(),
        setDoc: vi.fn().mockResolvedValue(undefined),
        updateDoc: vi.fn().mockResolvedValue(undefined),
        deleteDoc: vi.fn().mockResolvedValue(undefined),
        where: vi.fn(),
    };
});

import {
    validarDatosTarea,
    actualizarTarea,
    eliminarTarea,
    crearTarea,
    obtenerTareasPorVivienda,
} from './taskService';

describe('Gestión de Tareas (Edición y Eliminación por el Administrador)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('validarDatosTarea (Criterio 3)', () => {
        it('debe lanzar error si no se especifica la vivienda', () => {
            expect(() =>
                validarDatosTarea({
                    viviendaId: '',
                    titulo: 'Lavar platos',
                    fechaVencimiento: '2026-10-30',
                    responsableId: 'user-1',
                })
            ).toThrow('Debes pertenecer a una vivienda');
        });

        it('debe lanzar error si el título está vacío o solo contiene espacios', () => {
            expect(() =>
                validarDatosTarea({
                    viviendaId: 'vivienda-1',
                    titulo: '   ',
                    fechaVencimiento: '2026-10-30',
                    responsableId: 'user-1',
                })
            ).toThrow('El título de la tarea es obligatorio');
        });

        it('debe lanzar error si la fecha de vencimiento está vacía o inválida', () => {
            expect(() =>
                validarDatosTarea({
                    viviendaId: 'vivienda-1',
                    titulo: 'Lavar platos',
                    fechaVencimiento: '',
                    responsableId: 'user-1',
                })
            ).toThrow('Debes establecer una fecha límite');

            expect(() =>
                validarDatosTarea({
                    viviendaId: 'vivienda-1',
                    titulo: 'Lavar platos',
                    fechaVencimiento: 'fecha-no-valida',
                    responsableId: 'user-1',
                })
            ).toThrow('La fecha límite o programada no tiene un formato válido');
        });

        it('debe lanzar error si falta el responsable asignado', () => {
            expect(() =>
                validarDatosTarea({
                    viviendaId: 'vivienda-1',
                    titulo: 'Lavar platos',
                    fechaVencimiento: '2026-10-30',
                    responsableId: '  ',
                })
            ).toThrow('Debes asignar la tarea a un integrante específico');
        });

        it('no lanza error si todos los datos obligatorios son válidos', () => {
            expect(() =>
                validarDatosTarea({
                    viviendaId: 'vivienda-1',
                    titulo: 'Lavar platos',
                    fechaVencimiento: '2026-10-30',
                    responsableId: 'user-1',
                })
            ).not.toThrow();
        });
    });

    describe('actualizarTarea (Criterios 1, 2 y 6)', () => {
        it('permite al administrador actualizar la información de una tarea existente', async () => {
            const tareaOriginal = await crearTarea({
                viviendaId: 'viv-123',
                titulo: 'Limpiar sala',
                descripcion: 'Barrer y trapear',
                responsableId: 'integrante-1',
                responsableNombre: 'Carlos',
                fechaVencimiento: '2026-11-01',
            });

            const tareaModificada = await actualizarTarea({
                tareaId: tareaOriginal.id,
                viviendaId: 'viv-123',
                usuarioId: 'admin-1',
                administradorId: 'admin-1',
                titulo: 'Limpiar sala profunda',
                descripcion: 'Barrer, aspirar alfombra y trapear',
                responsableId: 'integrante-2',
                responsableNombre: 'Laura',
                fechaVencimiento: '2026-11-03',
            });

            expect(tareaModificada.id).toBe(tareaOriginal.id);
            expect(tareaModificada.titulo).toBe('Limpiar sala profunda');
            expect(tareaModificada.descripcion).toBe('Barrer, aspirar alfombra y trapear');
            expect(tareaModificada.responsableId).toBe('integrante-2');
            expect(tareaModificada.responsableNombre).toBe('Laura');
            expect(tareaModificada.fechaVencimiento).toBe('2026-11-03');

            // Criterio 6: Se refleja en las consultas de tareas
            const lista = await obtenerTareasPorVivienda('viv-123');
            const encontrada = lista.find((t) => t.id === tareaOriginal.id);
            expect(encontrada).toBeDefined();
            expect(encontrada?.titulo).toBe('Limpiar sala profunda');
            expect(encontrada?.responsableId).toBe('integrante-2');
        });

        it('rechaza la edición si el usuario no es el administrador de la vivienda', async () => {
            const tarea = await crearTarea({
                viviendaId: 'viv-123',
                titulo: 'Sacar basura',
                responsableId: 'integrante-1',
                fechaVencimiento: '2026-11-01',
            });

            await expect(
                actualizarTarea({
                    tareaId: tarea.id,
                    viviendaId: 'viv-123',
                    usuarioId: 'integrante-1', // No es el admin
                    administradorId: 'admin-1',
                    titulo: 'Sacar basura ahora',
                    responsableId: 'integrante-1',
                    fechaVencimiento: '2026-11-01',
                })
            ).rejects.toThrow('Solo el administrador de la vivienda puede editar las tareas');
        });
    });

    describe('eliminarTarea (Criterios 4, 5 y 6)', () => {
        it('permite al administrador eliminar una tarea y se refleja de inmediato en la lista', async () => {
            const tarea1 = await crearTarea({
                viviendaId: 'viv-123',
                titulo: 'Regar plantas',
                responsableId: 'user-1',
                fechaVencimiento: '2026-11-05',
            });

            const tarea2 = await crearTarea({
                viviendaId: 'viv-123',
                titulo: 'Comprar bombillo',
                responsableId: 'user-2',
                fechaVencimiento: '2026-11-06',
            });

            let lista = await obtenerTareasPorVivienda('viv-123');
            expect(lista.length).toBe(2);

            await eliminarTarea({
                tareaId: tarea1.id,
                viviendaId: 'viv-123',
                usuarioId: 'admin-1',
                administradorId: 'admin-1',
            });

            lista = await obtenerTareasPorVivienda('viv-123');
            expect(lista.length).toBe(1);
            expect(lista.some((t) => t.id === tarea1.id)).toBe(false);
            expect(lista[0].id).toBe(tarea2.id);
        });

        it('rechaza la eliminación si el usuario no es el administrador', async () => {
            const tarea = await crearTarea({
                viviendaId: 'viv-123',
                titulo: 'Tarea confidencial',
                responsableId: 'user-1',
                fechaVencimiento: '2026-11-05',
            });

            await expect(
                eliminarTarea({
                    tareaId: tarea.id,
                    viviendaId: 'viv-123',
                    usuarioId: 'user-1', // No es admin
                    administradorId: 'admin-1',
                })
            ).rejects.toThrow('Solo el administrador de la vivienda puede eliminar tareas');
        });
    });
});
