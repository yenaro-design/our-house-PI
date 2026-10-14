export type DebtStatus = 'pendiente' | 'parcial' | 'liquidada';
export type PaymentType = 'parcial' | 'total';

export interface DebtPayment {
  id: string;
  deudaId: string;
  gastoId: string;
  gastoConcepto: string;
  viviendaId: string;
  pagadorId: string; // Usuario que paga (deudor)
  pagadorNombre: string;
  receptorId: string; // Usuario que recibe el dinero (acreedor)
  receptorNombre: string;
  monto: number;
  tipo: PaymentType;
  fecha: string; // Formato YYYY-MM-DD
  nota?: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  gastoId: string;
  gastoConcepto: string;
  gastoFecha: string;
  viviendaId: string;
  deudorId: string;
  deudorNombre: string;
  acreedorId: string;
  acreedorNombre: string;
  montoOriginal: number;
  montoPagado: number;
  saldoPendiente: number;
  estado: DebtStatus;
  fechaCreacion: string;
  fechaLiquidacion?: string;
}
