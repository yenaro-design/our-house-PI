import { describe, expect, it } from 'vitest';
import type { Debt, DebtPayment } from '../models/Debt';
import type { Expense } from '../models/Expense';
import { calcularDesgloseDeuda, calcularDesgloseSaldo } from './desgloseService';

const gasto: Expense = {
  id: 'g-1', viviendaId: 'v-1', concepto: 'Mercado', monto: 100000,
  pagadorId: 'ana', pagadorNombre: 'Ana', participantes: ['ana', 'bruno'],
  fecha: '2026-01-01', cuotas: { ana: 50000, bruno: 50000 }, createdAt: '2026-01-01T10:00:00Z',
};

const pago: DebtPayment = {
  id: 'p-1', deudaId: 'd-1', gastoId: 'g-1', gastoConcepto: 'Mercado', viviendaId: 'v-1',
  pagadorId: 'bruno', pagadorNombre: 'Bruno', receptorId: 'ana', receptorNombre: 'Ana',
  monto: 20000, tipo: 'parcial', fecha: '2026-01-02', nota: 'Transferencia',
  createdAt: '2026-01-02T10:00:00Z',
};

describe('desgloseService', () => {
  it('incluye gastos y pagos, ordena por fecha y calcula acumulados', () => {
    const resultado = calcularDesgloseSaldo([gasto], [pago], 'bruno', -30000);
    expect(resultado.movimientos.map((m) => [m.tipo, m.id])).toEqual([['gasto', 'g-1'], ['pago', 'p-1']]);
    expect(resultado.movimientos[0]).toMatchObject({ efecto: -50000, titulo: 'Mercado' });
    expect(resultado.movimientos[1]).toMatchObject({ efecto: 20000, acumulado: -30000 });
    expect(resultado.saldo).toBe(-30000);
    expect(resultado.coincide).toBe(true);
  });

  it('ignora movimientos ajenos y usa nombres alternativos', () => {
    const ajeno = { ...pago, id: 'p-2', pagadorId: 'carla', receptorId: 'david' };
    const resultado = calcularDesgloseSaldo([], [ajeno], 'bruno', 0, { carla: 'Carla' });
    expect(resultado.movimientos).toEqual([]);
    expect(resultado.coincide).toBe(true);
  });

  it('reconstruye una deuda con pagos ordenados y valida contra gasto', () => {
    const deuda: Debt = {
      id: 'd-1', gastoId: 'g-1', gastoConcepto: 'Mercado', gastoFecha: '2026-01-01',
      viviendaId: 'v-1', deudorId: 'bruno', deudorNombre: 'Bruno', acreedorId: 'ana',
      acreedorNombre: 'Ana', montoOriginal: 50000, montoPagado: 20000, saldoPendiente: 30000,
      estado: 'parcial', fechaCreacion: '2026-01-01',
    };
    const resultado = calcularDesgloseDeuda(deuda, [pago], [gasto]);
    expect(resultado.movimientos).toHaveLength(2);
    expect(resultado.movimientos[1]).toMatchObject({ valor: -20000, saldoTras: 30000 });
    expect(resultado.totalPagado).toBe(20000);
    expect(resultado.saldoCalculado).toBe(30000);
    expect(resultado.coincide).toBe(true);
  });

  it('marca inconsistencias y admite pagos sin nota o gastos ausentes', () => {
    const deuda: Debt = {
      id: 'd-2', gastoId: 'missing', gastoConcepto: 'Otro', gastoFecha: '2026-01-01',
      viviendaId: 'v-1', deudorId: 'bruno', deudorNombre: 'Bruno', acreedorId: 'ana',
      acreedorNombre: 'Ana', montoOriginal: 50000, montoPagado: 0, saldoPendiente: 50000,
      estado: 'pendiente', fechaCreacion: '2026-01-01',
    };
    const resultado = calcularDesgloseDeuda(deuda, [{ ...pago, id: 'p-2', deudaId: 'd-2', nota: undefined, monto: 10000 }], []);
    expect(resultado.movimientos[1].descripcion).not.toContain('—');
    expect(resultado.coincide).toBe(false);
  });
});
