export interface Task {
  id: string;
  titulo: string;
  descripcion: string;
  responsableId: string;
  fechaVencimiento: Date;
  completada: boolean;
}