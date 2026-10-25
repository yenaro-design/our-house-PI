export type TaskEstado = 'pendiente' | 'realizada' | 'completada';

export interface Task {
  id: string;
  viviendaId: string;
  titulo: string;
  descripcion?: string;
  responsableId: string;
  responsableNombre?: string;
  fechaVencimiento: string;
  completada: boolean;
  estado?: TaskEstado;
  createdAt?: string;
  fechaCompletada?: string;
}
