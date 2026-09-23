export interface Dwelling {
  id: string;
  nombre: string;
  direccion?: string;
  codigoInvitacion: string;
  administradorId: string;
  integrantes: string[];
  creadoEn?: string;
}