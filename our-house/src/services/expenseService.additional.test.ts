import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Expense } from '../models/Expense';
import type { User } from '../models/User';

const firestore = vi.hoisted(() => ({
  collection: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(), getDocs: vi.fn(),
  query: vi.fn(), setDoc: vi.fn(), where: vi.fn(),
}));
const available = vi.hoisted(() => vi.fn(() => false));
vi.mock('firebase/firestore', () => firestore);
vi.mock('../firebase/config', () => ({ db: {}, isFirebasePersistenceAvailable: available }));

import {
  actualizarGasto, eliminarGasto, filtrarGastos, obtenerGastosPorVivienda,
  registrarGasto,
} from './expenseService';

const ana: User = { id: 'ana', nombre: 'Ana', email: 'ana@demo.co', ingresoMensual: 2000 };
const bruno: User = { id: 'bruno', nombre: 'Bruno', email: 'bruno@demo.co', ingresoMensual: 1000 };
const gasto: Expense = {
  id: 'g-1', viviendaId: 'v-1', concepto: 'Mercado', monto: 100,
  pagadorId: 'ana', pagadorNombre: 'Ana', participantes: ['ana', 'bruno'],
  fecha: '2026-01-02', categoria: 'Comida', cuotas: { ana: 67, bruno: 33 },
  createdAt: '2026-01-01T00:00:00Z',
};

describe('expenseService adicional', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    firestore.doc.mockReturnValue('expense-ref');
    firestore.collection.mockReturnValue('expenses');
    firestore.query.mockReturnValue('query');
    firestore.where.mockReturnValue('where');
    available.mockReturnValue(false);
  });

  it('registra gastos normalizados y valida campos requeridos', async () => {
    await expect(registrarGasto({ viviendaId: 'v', concepto: ' ', monto: 2, pagadorId: 'ana', participantes: ['ana'], fecha: '' }, [ana])).rejects.toThrow('concepto');
    await expect(registrarGasto({ viviendaId: 'v', concepto: 'x', monto: 0, pagadorId: 'ana', participantes: ['ana'], fecha: '' }, [ana])).rejects.toThrow('monto');
    await expect(registrarGasto({ viviendaId: 'v', concepto: 'x', monto: 2, pagadorId: '', participantes: ['ana'], fecha: '' }, [ana])).rejects.toThrow('seleccionar el integrante');
    await expect(registrarGasto({ viviendaId: 'v', concepto: 'x', monto: 2, pagadorId: 'ana', participantes: [], fecha: '' }, [ana])).rejects.toThrow('participante');
    const result = await registrarGasto({ viviendaId: 'v', concepto: '  Café ', monto: 100, pagadorId: 'ana', participantes: ['ana', 'bruno'], fecha: '2026-01-02' }, [ana, bruno]);
    expect(result).toMatchObject({ concepto: 'Café', categoria: 'Hogar', pagadorNombre: 'Ana' });
    expect(JSON.parse(localStorage.getItem('our_house_expenses')!)).toHaveLength(1);
  });

  it('actualiza gastos con validaciones, participantes únicos y fallback local', async () => {
    localStorage.setItem('our_house_expenses', JSON.stringify([gasto]));
    const input = { gastoId: 'g-1', viviendaId: 'v-1', concepto: '  Cena ', monto: 200, pagadorId: 'ana', participantes: ['ana', 'ana', 'bruno'], fecha: '2026-02-02', categoria: '  Hogar ', administradorId: 'ana', usuarioId: 'ana' };
    const result = await actualizarGasto(input, gasto, [ana, bruno]);
    expect(result).toMatchObject({ concepto: 'Cena', participantes: ['ana', 'bruno'], monto: 200, categoria: 'Hogar' });
    expect(firestore.setDoc).not.toHaveBeenCalled();
    await expect(actualizarGasto({ ...input, usuarioId: 'bruno' }, gasto, [ana, bruno])).rejects.toThrow('administrador');
    await expect(actualizarGasto({ ...input, fecha: '2026-02-31' }, gasto, [ana, bruno])).rejects.toThrow('fecha');
    await expect(actualizarGasto({ ...input, pagadorId: 'other' }, gasto, [ana, bruno])).rejects.toThrow('pagador');
  });

  it('consulta gastos remotos combinando local y usa fallback ordenado', async () => {
    localStorage.setItem('our_house_expenses', JSON.stringify([{ ...gasto, id: 'local', fecha: '2026-01-01' }]));
    firestore.getDocs.mockResolvedValueOnce({ empty: false, forEach: (cb: (x: { id: string; data: () => Expense }) => void) => cb({ id: 'remote', data: () => ({ ...gasto, fecha: '2026-03-01' }) }) });
    expect((await obtenerGastosPorVivienda('v-1')).map((g) => g.id)).toEqual(['g-1', 'local']);
    firestore.getDocs.mockRejectedValueOnce(new Error('offline'));
    expect((await obtenerGastosPorVivienda('v-1')).map((g) => g.id)).toEqual(['local']);
    expect(await obtenerGastosPorVivienda('')).toEqual([]);
  });

  it('filtra por texto, fechas y pagador, y elimina solo como administrador', async () => {
    expect(filtrarGastos([gasto, { ...gasto, id: 'g-2', pagadorId: 'bruno', pagadorNombre: 'Bruno', fecha: '2026-03-01', categoria: 'Luz' }], { busqueda: 'luz', fechaInicio: '2026-02-01', pagadorId: 'bruno' })).toHaveLength(1);
    await expect(eliminarGasto({ gastoId: 'g-1', viviendaId: 'v-1', administradorId: 'ana', usuarioId: 'bruno' })).rejects.toThrow('administrador');
    await eliminarGasto({ gastoId: 'g-1', viviendaId: 'v-1', administradorId: 'ana', usuarioId: 'ana' });
    expect(JSON.parse(localStorage.getItem('our_house_expenses')!)).toEqual([]);
  });
});
