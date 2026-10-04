export interface Task {
  id: string;
  viviendaId: string;
  titulo: string;
  descripcion?: string;
  responsableId: string;
  responsableNombre?: string;
  fechaVencimiento: string; // Formato YYYY-MM-DD
  completada: boolean;
  createdAt?: string;
}