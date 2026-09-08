import {
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Home,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Edit3,
  CheckCircle2,
  Clock,
  HeartPulse,
  CreditCard,
  Bell,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import type { UserProfile } from '../types';
import { formatCOP } from '../utils/formatters';

interface ProfileViewProps {
  user: UserProfile;
  onEdit: () => void;
  onOpenExitModal: () => void;
  onViewProportional: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onEdit,
  onOpenExitModal,
  onViewProportional,
}) => {
  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Banner Principal del Perfil */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cabecera decorativa sutil */}
        <div className="h-28 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sesión Autenticada</span>
            </span>
          </div>
        </div>

        {/* Contenedor de Información con Avatar superpuesto */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-end gap-4">
              <div
                className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${user.avatarColor} text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white shadow-lg shrink-0`}
              >
                {initials}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {user.fullName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {user.dwellingRole}
                  </span>
                </div>
                <p className="text-sm text-slate-600 font-medium mt-0.5 flex items-center gap-2">
                  <span>{user.occupation}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">{user.email}</span>
                </p>
              </div>
            </div>

            {/* Botón de edición de perfil (HU-03) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar perfil personal</span>
              </button>
            </div>
          </div>

          {/* Fila de metadatos de sincronización */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Última actualización: {user.lastUpdatedAt}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Miembro desde: {user.joinedDate}</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200/50">
              <CheckCircle2 className="w-3 h-3" />
              <span>Datos sincronizados localmente</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Secciones del Perfil */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda & Central (2 spans): Datos Personales y Financieros */}
        <div className="md:col-span-2 space-y-6">
          {/* Bloque Financiero y Prorrateo (RF03 / HU04) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    Parámetros Financieros en la Vivienda
                  </h2>
                  <p className="text-xs text-slate-500">
                    Base para la distribución porcentual y prorrateo de gastos comunitarios
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onViewProportional}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Simular cálculo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Ingreso Mensual Individual
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCOP(user.monthlyIncome)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Reportado en el perfil para cálculo de cuotas equitativas según ingresos relativos.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Saldo Actual en la Vivienda
                </div>
                <div
                  className={`text-2xl font-black tracking-tight ${
                    user.currentBalance > 0
                      ? 'text-emerald-600'
                      : user.currentBalance < 0
                      ? 'text-rose-600'
                      : 'text-slate-700'
                  }`}
                >
                  {user.currentBalance > 0 && '+'}
                  {formatCOP(user.currentBalance)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {user.currentBalance > 0
                    ? 'Saldo a favor (otros integrantes te deben por gastos cubiertos)'
                    : user.currentBalance < 0
                    ? 'Saldo pendiente por liquidar en la vivienda'
                    : 'Sin deudas ni saldos pendientes ($0)'}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 leading-relaxed">
                <span className="font-semibold">Distribución Equitativa:</span> Cada vez que
                actualizas tu ingreso mensual en el perfil, el sistema recalcula automáticamente
                el peso relativo de tu cuota sobre el total de la vivienda mediante la fórmula oficial{' '}
                <code className="bg-white/80 px-1 py-0.5 rounded text-indigo-800 font-mono text-[11px]">
                  C_i = Monto_Total * (Ingreso_i / Total_Ingresos)
                </code>
                .
              </div>
            </div>
          </div>

          {/* Datos Personales y de Contacto */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Información Personal y de Contacto
                </h2>
                <p className="text-xs text-slate-500">
                  Datos de contacto visibles para los demás habitantes del hogar
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Nombre Completo
                </span>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  {user.fullName}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Correo Electrónico
                </span>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {user.email}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Teléfono Móvil
                </span>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {user.phone}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Ocupación / Rol Académico
                </span>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  {user.occupation}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Cuenta / Alias de Pago Rápido
                </span>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span>{user.paymentAlias || 'No registrado aún'}</span>
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Biografía y Notas para Roommates
                </span>
                <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 italic">
                  "{user.bio || 'Sin biografía registrada.'}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha (1 span): Vivienda, Emergencias, Preferencias */}
        <div className="space-y-6">
          {/* Tarjeta de Vivienda Asociada (RF04 / RF06) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-200">
                <Home className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Vivienda Vinculada</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Nombre de la Casa</span>
                <p className="font-semibold text-slate-800">{user.dwellingName}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Dirección</span>
                <p className="text-xs text-slate-600">{user.dwellingAddress}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Rol en el hogar:</span>
                <span className="font-semibold text-slate-800">{user.dwellingRole}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Tareas pendientes:</span>
                <span className="font-semibold text-slate-800">{user.pendingTasksCount} asignada(s)</span>
              </div>
            </div>

            {/* Enlace para salida voluntaria con validación RF20 */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onOpenExitModal}
                className="w-full text-xs font-semibold text-slate-600 hover:text-rose-600 py-2 px-3 rounded-lg hover:bg-rose-50/60 border border-slate-200 hover:border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Gestionar salida de la vivienda</span>
              </button>
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <HeartPulse className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Contacto de Emergencia</h2>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Persona de Contacto</span>
                <p className="text-sm font-semibold text-slate-800">
                  {user.emergencyContactName || 'No especificado'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Teléfono de Emergencia</span>
                <p className="text-sm text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {user.emergencyContactPhone || 'No especificado'}
                </p>
              </div>
            </div>
          </div>

          {/* Preferencias de Notificaciones */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Preferencias de Avisos</h2>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Alertas de nuevos gastos</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    user.notificationPreferences.expenseAlerts ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Recordatorios de tareas domésticas</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    user.notificationPreferences.taskReminders ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Avisos de liquidación de saldos</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    user.notificationPreferences.settlementNotices ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
