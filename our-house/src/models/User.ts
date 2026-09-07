export interface User {
  id: string;
  nombre: string;
  email: string;
  ingresoMensual: number;
  viviendaId?: string;
}