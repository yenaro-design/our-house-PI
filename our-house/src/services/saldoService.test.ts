import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Expense } from '../models/Expense'
import type { DebtPayment } from '../models/Debt'
import { calcularResumenSaldo, obtenerResumenSaldo } from './saldoService'

const { obtenerGastosPorVivienda, obtenerPagosPorVivienda } = vi.hoisted(() => ({
  obtenerGastosPorVivienda: vi.fn<(viviendaId: string) => Promise<Expense[]>>(),
  obtenerPagosPorVivienda: vi.fn<(viviendaId: string) => Promise<DebtPayment[]>>(),
}))

vi.mock('./expenseService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./expenseService')>()
  return { ...actual, obtenerGastosPorVivienda }
})
vi.mock('./debtService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./debtService')>()
  return { ...actual, obtenerPagosPorVivienda }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('calcularResumenSaldo', () => {
  it('identifica una deuda y calcula sus totales', () => {
    const resultado = calcularResumenSaldo(
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
      'bruno',
    )

    expect(resultado).toMatchObject({
      saldo: -50_000,
      deudaPendiente: 50_000,
      valorAFavor: 0,
      totalPagado: 0,
      totalCuotas: 50_000,
      pagosRealizados: 0,
      pagosRecibidos: 0,
      cantidadGastos: 1,
      estado: 'deuda',
    })
  })

  it('identifica un saldo a favor y descuenta pagos recibidos', () => {
    const resultado = calcularResumenSaldo(
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
      'ana',
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

    expect(resultado).toMatchObject({
      saldo: 30_000,
      deudaPendiente: 0,
      valorAFavor: 30_000,
      totalPagado: 100_000,
      totalCuotas: 50_000,
      pagosRealizados: 0,
      pagosRecibidos: 20_000,
      cantidadGastos: 1,
      estado: 'favor',
    })
  })

  it('considera al día un saldo dentro de la tolerancia de redondeo', () => {
    const resultado = calcularResumenSaldo(
      [
        {
          id: 'gasto-2',
          viviendaId: 'vivienda-1',
          concepto: 'Ajuste',
          monto: 100,
          pagadorId: 'ana',
          participantes: ['ana'],
          fecha: '2026-01-03',
          cuotas: { ana: 100.005 },
        },
      ],
      'ana',
    )

    expect(resultado.saldo).toBeCloseTo(-0.005)
    expect(resultado.estado).toBe('al-dia')
  })

  it('obtiene gastos y pagos de una vivienda antes de calcular el resumen', async () => {
    obtenerGastosPorVivienda.mockResolvedValue([
      {
        id: 'gasto-3',
        viviendaId: 'vivienda-1',
        concepto: 'Internet',
        monto: 60_000,
        pagadorId: 'ana',
        participantes: ['ana', 'bruno'],
        fecha: '2026-01-04',
        cuotas: { ana: 30_000, bruno: 30_000 },
      },
    ])
    obtenerPagosPorVivienda.mockResolvedValue([])

    const resultado = await obtenerResumenSaldo('vivienda-1', 'bruno')

    expect(obtenerGastosPorVivienda).toHaveBeenCalledWith('vivienda-1')
    expect(obtenerPagosPorVivienda).toHaveBeenCalledWith('vivienda-1')
    expect(resultado.estado).toBe('deuda')
    expect(resultado.deudaPendiente).toBe(30_000)
  })
})
