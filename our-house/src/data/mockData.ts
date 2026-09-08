import type { UserProfile, RoommateMember, ProfileAuditLog } from '../types';

export const INITIAL_USER_PROFILE: UserProfile = {
  id: 'usr_2230193',
  fullName: 'Gabriela Chavez Aguilera',
  email: 'chavezaguileragabriela@gmail.com',
  phone: '315 789 4521',
  monthlyIncome: 2400000, // $2,400,000 COP
  occupation: 'Estudiante de Ingeniería Informática',
  avatarUrl: '',
  avatarColor: 'from-violet-500 to-indigo-600',
  bio: 'Co-organizadora del hogar, responsable de la coordinación de compras del mercado y servicios generales.',
  emergencyContactName: 'Jovan Chavez (Padre)',
  emergencyContactPhone: '312 456 7890',
  paymentAlias: 'Nequi -> @gabriela.chavez',
  dwellingId: 'dw_uao_2026_01',
  dwellingName: 'Vivienda Compartida - Valle del Lili',
  dwellingAddress: 'Cra 98 # 25-40, Cali, Valle del Cauca',
  dwellingRole: 'Administrador',
  joinedDate: '15 de Enero, 2026',
  currentBalance: 45000, // $45.000 a favor
  pendingTasksCount: 1, // Tarea pendiente: "Limpieza profunda de cocina"
  notificationPreferences: {
    expenseAlerts: true,
    taskReminders: true,
    settlementNotices: true,
    emailDigest: false,
  },
  lastUpdatedAt: new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
};

export const INITIAL_ROOMMATES: RoommateMember[] = [
  {
    id: 'usr_2230193',
    name: 'Gabriela Chavez Aguilera',
    role: 'Administrador (Tú)',
    monthlyIncome: 2400000,
    avatarColor: 'from-violet-500 to-indigo-600',
  },
  {
    id: 'usr_2230197',
    name: 'Santiago Morales Suarez',
    role: 'Integrante',
    monthlyIncome: 2200000,
    avatarColor: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'usr_2236708',
    name: 'Alan Basante Portilla',
    role: 'Integrante',
    monthlyIncome: 2600000,
    avatarColor: 'from-amber-500 to-orange-600',
  },
  {
    id: 'usr_2236548',
    name: 'Yenaro Samuel Gracia Ruiz',
    role: 'Integrante',
    monthlyIncome: 2000000,
    avatarColor: 'from-sky-500 to-blue-600',
  },
];

export const INITIAL_AUDIT_LOGS: ProfileAuditLog[] = [
  {
    id: 'log_01',
    timestamp: 'Hace 3 días - 14:30',
    changedFields: [
      {
        field: 'Ingreso mensual estimado',
        oldValue: '$2,200,000 COP',
        newValue: '$2,400,000 COP',
      },
      {
        field: 'Teléfono de contacto',
        oldValue: '310 123 4567',
        newValue: '315 789 4521',
      },
    ],
    summary: 'Actualización ordinaria de ingresos semestrales y número móvil.',
  },
  {
    id: 'log_00',
    timestamp: '15 de Enero, 2026 - 09:15',
    changedFields: [
      {
        field: 'Registro de perfil',
        oldValue: 'Nuevo usuario',
        newValue: 'Perfil completado',
      },
    ],
    summary: 'Creación y configuración inicial del perfil en Our House.',
  },
];

export const AVATAR_COLOR_PALETTES = [
  { name: 'Índigo Violeta', value: 'from-violet-500 to-indigo-600' },
  { name: 'Esmeralda Menta', value: 'from-emerald-500 to-teal-600' },
  { name: 'Ámbar Cálido', value: 'from-amber-500 to-orange-600' },
  { name: 'Azul Océano', value: 'from-sky-500 to-blue-600' },
  { name: 'Rosa Frambuesa', value: 'from-rose-500 to-pink-600' },
  { name: 'Púrpura Ciruela', value: 'from-purple-500 to-fuchsia-600' },
];
