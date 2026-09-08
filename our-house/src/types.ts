export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  monthlyIncome: number; // Ingreso mensual individual estimado
  occupation: string;
  avatarUrl: string;
  avatarColor: string;
  bio: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  paymentAlias: string; // Nequi, Daviplata, etc.
  dwellingId: string;
  dwellingName: string;
  dwellingAddress: string;
  dwellingRole: 'Administrador' | 'Integrante';
  joinedDate: string;
  currentBalance: number; // Saldo en la vivienda (positivo: a favor, negativo: deuda)
  pendingTasksCount: number; // Tareas asignadas pendientes
  notificationPreferences: {
    expenseAlerts: boolean;
    taskReminders: boolean;
    settlementNotices: boolean;
    emailDigest: boolean;
  };
  lastUpdatedAt: string;
}

export interface ProfileAuditLog {
  id: string;
  timestamp: string;
  changedFields: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  summary: string;
}

export interface RoommateMember {
  id: string;
  name: string;
  role: string;
  monthlyIncome: number;
  avatarColor: string;
}
