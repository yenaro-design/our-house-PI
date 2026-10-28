import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Debt } from '../models/Debt';

const firestore = vi.hoisted(() => ({
  collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(), query: vi.fn(), setDoc: vi.fn(), where: vi.fn(),
}));
vi.mock('firebase/firestore', () => firestore);
vi.mock('../firebase/config', () => ({
  db: {}, isFirebasePersistenceAvailable: vi.fn(() => false),
}));

import {
  obtenerDeudasPorVivienda, obtenerPagosPorVivienda, registrarPagoDeuda,
  obtenerPagosPorDeuda, sincronizarDeudasDesdeGastos,
} from './debtService';

const baseDebt: Debt = {
  id: 'deuda-g-1-bruno', gastoId: 'g-1', gastoConcepto: 'Mercado', gastoFecha: '2026-01-01',
  viviendaId: 'v-1', deudorId: 'bruno', deudorNombre: 'Bruno', acreedorId: 'ana',
  acreedorNombre: 'Ana', montoOriginal: 50000, montoPagado: 0, saldoPendiente: 50000,
  estado: 'pendiente', fechaCreacion: '2026-01-01',
};

describe('debtService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    firestore.collection.mockReturnValue('collection');
    firestore.query.mockReturnValue('query');
    firestore.where.mockReturnValue('where');
  });

  it('sincroniza cuotas, conserva pagos y ordena no liquidadas antes de liquidadas', async () => {
    localStorage.setItem('our_house_debts', JSON.stringify([{ ...baseDebt, montoPagado: 50000, saldoPendiente: 0, estado: 'liquidada' }]));
    const result = await sincronizarDeudasDesdeGastos('v-1', [
      { id: 'g-1', viviendaId: 'v-1', concepto: 'Mercado', monto: 100000, pagadorId: 'ana',
        participantes: ['ana', 'bruno'], fecha: '2026-01-01', cuotas: { ana: 50000, bruno: 50000 } },
      { id: 'g-2', viviendaId: 'v-1', concepto: 'Luz', monto: 60000, pagadorId: 'ana',
        participantes: ['ana', 'carla'], fecha: '2026-02-01', cuotas: { ana: 30000, carla: 30000 } },
    ], [{ id: 'ana', nombre: 'Ana', email: 'a' }, { id: 'bruno', nombre: 'Bruno', email: 'b' }, { id: 'carla', nombre: 'Carla', email: 'c' }]);
    expect(result.map((d) => d.id)).toEqual(['deuda-g-2-carla', 'deuda-g-1-bruno']);
    expect(result[1].estado).toBe('liquidada');
  });

  it('combina remoto y local, y usa fallback local ante error', async () => {
    localStorage.setItem('our_house_debts', JSON.stringify([{ ...baseDebt, id: 'local' }]));
    firestore.getDocs.mockResolvedValueOnce({ empty: false, forEach: (cb: (x: { data: () => Debt }) => void) => cb({ data: () => baseDebt }) });
    await expect(obtenerDeudasPorVivienda('v-1')).resolves.toHaveLength(2);
    firestore.getDocs.mockRejectedValueOnce(new Error('offline'));
    await expect(obtenerDeudasPorVivienda('v-1')).resolves.toEqual([expect.objectContaining({ id: 'local' })]);
  });

  it('registra pago parcial y rechaza valores inválidos o deuda inexistente', async () => {
    localStorage.setItem('our_house_debts', JSON.stringify([baseDebt]));
    await expect(registrarPagoDeuda({ deudaId: 'missing', monto: 1, tipo: 'parcial' })).rejects.toThrow('no existe');
    await expect(registrarPagoDeuda({ deudaId: baseDebt.id, monto: 50001, tipo: 'parcial' })).rejects.toThrow('supera el saldo');
    const result = await registrarPagoDeuda({ deudaId: baseDebt.id, monto: 20000, tipo: 'parcial', fecha: '2026-02-01', nota: '  ok  ' });
    expect(result.deudaActualizada).toMatchObject({ montoPagado: 20000, saldoPendiente: 30000, estado: 'parcial' });
    expect(result.pago).toMatchObject({ monto: 20000, nota: 'ok', pagadorId: 'bruno', receptorId: 'ana' });
  });

  it('obtiene pagos locales ordenados y devuelve vacío para vivienda inválida', async () => {
    localStorage.setItem('our_house_debt_payments', JSON.stringify([
      { id: 'old', deudaId: 'd', viviendaId: 'v-1', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'new', deudaId: 'd', viviendaId: 'v-1', createdAt: '2026-02-01T00:00:00Z' },
    ]));
    expect(await obtenerPagosPorVivienda('')).toEqual([]);
    firestore.getDocs.mockRejectedValue(new Error('offline'));
    expect((await obtenerPagosPorVivienda('v-1')).map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('cubre validaciones de pago total, deuda liquidada y consulta remota de pagos', async () => {
    expect(await sincronizarDeudasDesdeGastos('', [], [])).toEqual([]);
    localStorage.setItem('our_house_debts', JSON.stringify([{ ...baseDebt, estado: 'liquidada', saldoPendiente: 0, montoPagado: 50000 }]));
    await expect(registrarPagoDeuda({ deudaId: baseDebt.id, monto: 1, tipo: 'parcial' })).rejects.toThrow('liquidada');
    localStorage.setItem('our_house_debts', JSON.stringify([baseDebt]));
    await expect(registrarPagoDeuda({ deudaId: baseDebt.id, monto: 0, tipo: 'parcial' })).rejects.toThrow('entero');
    await expect(registrarPagoDeuda({ deudaId: baseDebt.id, monto: 10000, tipo: 'total' })).rejects.toThrow('coincidir exactamente');
    const storedPayment = { id: 'remote-pay', deudaId: baseDebt.id, viviendaId: 'v-1', createdAt: '2026-03-01T00:00:00Z' };
    firestore.getDocs.mockResolvedValueOnce({ empty: false, forEach: (cb: (x: { data: () => typeof storedPayment }) => void) => cb({ data: () => storedPayment }) });
    await expect(obtenerPagosPorVivienda('v-1')).resolves.toEqual([storedPayment]);
    localStorage.setItem('our_house_debt_payments', JSON.stringify([storedPayment]));
    await expect(obtenerPagosPorDeuda(baseDebt.id)).resolves.toEqual([storedPayment]);
  });
});
