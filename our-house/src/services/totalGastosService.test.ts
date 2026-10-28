import { describe, it, expect } from 'vitest';
import type { Expense } from '../models/Expense';
import { calcularTotalGastosPeriodo } from './totalGastosService';

const gasto = (monto: number, fecha: string): Expense => ({
    id: `${fecha}-${monto}`,
    viviendaId: 'v1',
    concepto: 'prueba',
    monto,
    pagadorId: 'u1',
    participantes: ['u1'],
    fecha,
    cuotas: { u1: monto },
});

describe('calcularTotalGastosPeriodo', () => {
    it('suma solo los gastos del periodo pedido', () => {
        const gastos = [gasto(1000, '2026-10-05'), gasto(2500, '2026-10-20'), gasto(9000, '2026-09-30')];
        expect(calcularTotalGastosPeriodo(gastos, '2026-10')).toEqual({ total: 3500, cantidad: 2 });
    });

    it('devuelve cero cuando no hay gastos en el periodo', () => {
        expect(calcularTotalGastosPeriodo([], '2026-10')).toEqual({ total: 0, cantidad: 0 });
    });
});