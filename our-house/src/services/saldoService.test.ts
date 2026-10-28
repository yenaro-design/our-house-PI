import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Expense } from '../models/Expense'
import type { Debt, DebtPayment } from '../models/Debt'
import {
  calcularDetalleDeudas,
  calcularResumenSaldo,
  obtenerResumenSaldo,
} from './saldoService'

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

})

describe('calcularDetalleDeudas', () => {
  const crearDeuda = (overrides: Partial<Debt>): Debt => ({
    id: 'deuda-1',
    gastoId: 'gasto-1',
    gastoConcepto: 'Mercado',
    gastoFecha: '2026-01-01',
    viviendaId: 'vivienda-1',
    deudorId: 'bruno',
    deudorNombre: 'Bruno',
    acreedorId: 'ana',
    acreedorNombre: 'Ana',
    montoOriginal: 50_000,
    montoPagado: 0,
    saldoPendiente: 50_000,
    estado: 'pendiente',
    fechaCreacion: '2026-01-01',
    ...overrides,
  })

  it('agrupa deudas y acreencias por persona, ordena y calcula totales', () => {
    const resultado = calcularDetalleDeudas(
      [
        crearDeuda({ id: 'deuda-1', saldoPendiente: 20_000 }),
        crearDeuda({
          id: 'deuda-2',
          acreedorId: 'carla',
          acreedorNombre: 'Carla',
          saldoPendiente: 30_000,
        }),
      ],
      'bruno',
    )

    expect(resultado).toEqual({
      debo: [
        { personaId: 'carla', nombre: 'Carla', monto: 30_000, cantidad: 1 },
        { personaId: 'ana', nombre: 'Ana', monto: 20_000, cantidad: 1 },
      ],
      meDeben: [],
      totalDebo: 50_000,
      totalMeDeben: 0,
    })

    const acreencias = calcularDetalleDeudas(
      [
        crearDeuda({
          id: 'deuda-3',
          deudorId: 'diana',
          deudorNombre: 'Diana',
          acreedorId: 'ana',
          acreedorNombre: 'Ana',
          saldoPendiente: 15_000,
        }),
        crearDeuda({
          id: 'deuda-4',
          deudorId: 'diana',
          deudorNombre: 'Diana',
          acreedorId: 'ana',
          acreedorNombre: 'Ana',
          saldoPendiente: 10_000,
        }),
      ],
      'ana',
    )

    expect(acreencias.meDeben).toEqual([
      { personaId: 'diana', nombre: 'Diana', monto: 25_000, cantidad: 2 },
    ])
    expect(acreencias.totalMeDeben).toBe(25_000)
  })

  it('ignora deudas liquidadas, saldadas y entre otros usuarios', () => {
    const resultado = calcularDetalleDeudas(
      [
        crearDeuda({ id: 'liquidada', estado: 'liquidada' }),
        crearDeuda({ id: 'saldada', saldoPendiente: 0 }),
        crearDeuda({
          id: 'deuda-ajena',
          deudorId: 'carlos',
          deudorNombre: 'Carlos',
          acreedorId: 'diana',
          acreedorNombre: 'Diana',
        }),
      ],
      'ana',
    )

    expect(resultado).toEqual({
      debo: [],
      meDeben: [],
      totalDebo: 0,
      totalMeDeben: 0,
    })
  })
})

describe('calcularResumenSaldo', () => {

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

  it('suma los pagos realizados por el usuario', () => {
    const resultado = calcularResumenSaldo([], 'bruno', [
      {
        id: 'pago-2',
        deudaId: 'deuda-2',
        gastoId: 'gasto-2',
        gastoConcepto: 'Internet',
        viviendaId: 'vivienda-1',
        pagadorId: 'bruno',
        pagadorNombre: 'Bruno',
        receptorId: 'ana',
        receptorNombre: 'Ana',
        monto: 15_000,
        tipo: 'parcial',
        fecha: '2026-01-05',
        createdAt: '2026-01-05T00:00:00.000Z',
      },
    ])

    expect(resultado.pagosRealizados).toBe(15_000)
    expect(resultado.pagosRecibidos).toBe(0)
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
