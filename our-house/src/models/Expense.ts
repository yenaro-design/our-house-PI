export interface ExpenseShare {
  userId: string;
  nombre: string;
  ingreso: number;
  proporcion: number; // Porcentaje proporcional (e.g. 0.35 para 35%)
  cuota: number; // Monto calculado en moneda local (redondeado al entero)
}

export interface Expense {
  id: string;
  viviendaId: string;
  concepto: string;
  monto: number;
  pagadorId: string;
  pagadorNombre?: string;
  participantes: string[];
  fecha: string; // Formato YYYY-MM-DD
  categoria?: string;
  cuotas: Record<string, number>; // userId -> cuota exacta en COP
  desgloseCuotas?: ExpenseShare[];
  residuoAjustado?: number; // Residuo de redondeo acreditado/debitado al pagador
  createdAt?: string;
}