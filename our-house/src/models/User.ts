export interface User {
  id: string;
  nombre: string;
  email: string;
  ingresoMensual: number;
  telefono?: string;
  viviendaId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}