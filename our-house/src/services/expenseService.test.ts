import { describe, expect, it } from 'vitest'
import type { User } from '../models/User'
import { calcularDistribucionProporcional, calcularSaldosConsolidados } from './expenseService'

const ana: User = {
  id: 'ana',
  nombre: 'Ana',
  email: 'ana@example.com',
  ingresoMensual: 2_000_000,
}

const bruno: User = {
  id: 'bruno',
  nombre: 'Bruno',
  email: 'bruno@example.com',
  ingresoMensual: 1_000_000,
}

describe('calcularDistribucionProporcional', () => {
  it('distribuye proporcionalmente y ajusta el residuo al pagador', () => {
    const resultado = calcularDistribucionProporcional(100_000, 'ana', [ana, bruno])

    expect(resultado.totalIngresos).toBe(3_000_000)
    expect(resultado.cuotas).toEqual({ ana: 66_667, bruno: 33_333 })
    expect(resultado.desgloseCuotas.map(({ userId, cuota }) => ({ userId, cuota }))).toEqual([
      { userId: 'ana', cuota: 66_667 },
      { userId: 'bruno', cuota: 33_333 },
    ])
    expect(Object.values(resultado.cuotas).reduce((total, cuota) => total + cuota, 0)).toBe(100_000)
    expect(resultado.residuoAjustado).toBe(0)
  })

  it('reparte equitativamente cuando los participantes no tienen ingresos', () => {
    const sinIngresos = [
      { ...ana, ingresoMensual: 0 },
      { ...bruno, ingresoMensual: 0 },
    ]

    const resultado = calcularDistribucionProporcional(101, 'ana', sinIngresos)

    expect(resultado.cuotas).toEqual({ ana: 50, bruno: 51 })
    expect(resultado.desgloseCuotas.every(({ proporcion }) => proporcion === 0.5)).toBe(true)
    expect(resultado.totalIngresos).toBe(0)
  })

  it('devuelve una distribución vacía para un monto inválido o sin participantes', () => {
    expect(calcularDistribucionProporcional(0, 'ana', [ana])).toEqual({
      cuotas: {},
      desgloseCuotas: [],
      residuoAjustado: 0,
      totalIngresos: 0,
    })
    expect(calcularDistribucionProporcional(100, 'ana', [])).toEqual({
      cuotas: {},
      desgloseCuotas: [],
      residuoAjustado: 0,
      totalIngresos: 0,
    })
  })
})

describe('calcularSaldosConsolidados', () => {
  it('calcula saldos y aplica pagos entre integrantes', () => {
    const resultado = calcularSaldosConsolidados(
      [
        {
          id: 'gasto-1',
          viviendaId: 'vivienda-1',
          concepto: 'Mercado',
          monto: 100_000,
          pagadorId: 'ana',
          participantes: ['ana', 'bruno'],
          fecha: '2026-01-01',
          cuotas: { ana: 50_000, bruno: 50_000 },
        },
      ],
      [ana, bruno],
      [
        {
          id: 'pago-1',
          deudaId: 'deuda-1',
          gastoId: 'gasto-1',
          gastoConcepto: 'Mercado',
          viviendaId: 'vivienda-1',
          pagadorId: 'bruno',
          pagadorNombre: 'Bruno',
          receptorId: 'ana',
          receptorNombre: 'Ana',
          monto: 20_000,
          tipo: 'parcial',
          fecha: '2026-01-02',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    )

    expect(resultado).toEqual({ ana: 30_000, bruno: -30_000 })
  })

  it('incluye usuarios que aparecen en gastos aunque no estén en integrantes', () => {
    const resultado = calcularSaldosConsolidados(
      [
        {
          id: 'gasto-2',
          viviendaId: 'vivienda-1',
          concepto: 'Servicio',
          monto: 80_000,
          pagadorId: 'carla',
          participantes: ['carla'],
          fecha: '2026-01-03',
          cuotas: { carla: 80_000 },
        },
      ],
      [],
    )

    expect(resultado).toEqual({ carla: 0 })
  })
})
