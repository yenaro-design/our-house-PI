export interface Expense {
  id: string;
  concepto: string;
  monto: number;
  pagadorId: string;
  participantes: string[];
  fecha: Date;
}