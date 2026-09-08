import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
  Palette,
  HeartPulse,
  CreditCard,
  Bell,
  HelpCircle,
} from 'lucide-react';
import type { UserProfile } from '../types';
import { AVATAR_COLOR_PALETTES } from '../data/mockData';
import { validateProfileData, type ValidationErrors } from '../utils/validators';
import { formatCOP } from '../utils/formatters';

interface ProfileEditFormProps {
  initialProfile: UserProfile;
  onCancel: () => void;
  onRequestSave: (updatedProfile: UserProfile) => void;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  initialProfile,
  onCancel,
  onRequestSave,
}) => {
  // Estado local del formulario
  const [formData, setFormData] = useState<UserProfile>({ ...initialProfile });
  const [rawIncome, setRawIncome] = useState<string>(String(initialProfile.monthlyIncome));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);

  // Validación dinámica
  const handleValidateField = (field: keyof ValidationErrors, value: string) => {
    const currentData = {
      ...formData,
      [field]: value,
    };

    const validation = validateProfileData({
      fullName: field === 'fullName' ? value : currentData.fullName,
      email: field === 'email' ? value : currentData.email,
      phone: field === 'phone' ? value : currentData.phone,
      monthlyIncome: field === 'monthlyIncome' ? value : rawIncome,
      occupation: field === 'occupation' ? value : currentData.occupation,
      emergencyContactName: field === 'emergencyContactName' ? value : currentData.emergencyContactName,
      emergencyContactPhone: field === 'emergencyContactPhone' ? value : currentData.emergencyContactPhone,
    });

    if (hasAttemptedSubmit) {
      setErrors(validation.errors);
      setWarnings(validation.warnings);
    } else {
      // Si aún no intentó guardar, solo limpiar el error del campo específico si ya es válido
      if (!validation.errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    }
  };

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setRawIncome(val);
    const numericVal = val === '' ? 0 : Number(val);
    setFormData((prev) => ({ ...prev, monthlyIncome: numericVal }));

    if (hasAttemptedSubmit) {
      const validation = validateProfileData({
        ...formData,
        monthlyIncome: val,
      });
      setErrors(validation.errors);
      setWarnings(validation.warnings);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    const validation = validateProfileData({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      monthlyIncome: rawIncome,
      occupation: formData.occupation,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
    });

    setErrors(validation.errors);
    setWarnings(validation.warnings);

    if (!validation.isValid) {
      // Scroll to first error or shake
      const firstError = Object.keys(validation.errors)[0];
      const element = document.getElementById(`field-${firstError}`);
      if (element) {
        element.focus();
      }
      return;
    }

    // Datos validados e íntegros: solicitar confirmación
    onRequestSave({
      ...formData,
      monthlyIncome: Number(rawIncome) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cabecera del formulario de edición */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Modificar Datos de Perfil
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Modo Edición
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Los campos marcados con asterisco (*) son obligatorios y pasan por validación estricta de formato.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>

      {/* Alerta si existen errores de validación */}
      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-1">
              No es posible guardar: Existen errores en el formulario
            </span>
            <ul className="list-disc pl-5 text-xs space-y-1 text-rose-700">
              {Object.entries(errors).map(([key, err]) => (
                <li key={key}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Advertencias no bloqueantes */}
      {warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Avisos del sistema:</span>
            <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
              {warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sección 1: Identidad y Avatar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-600" />
          <span>Personalización de Identidad Visual</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Preview */}
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${formData.avatarColor} text-white flex items-center justify-center text-2xl font-bold ring-4 ring-slate-100 shadow-md shrink-0`}
          >
            {formData.fullName
              ? formData.fullName
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : '??'}
          </div>

          <div className="space-y-2 w-full">
            <label className="text-xs font-semibold text-slate-700 block">
              Color de tu insignia de perfil:
            </label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, avatarColor: palette.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                    formData.avatarColor === palette.value
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${palette.value}`} />
                  <span>{palette.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sección 2: Datos Personales Editables */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          <span>Datos Personales y de Contacto</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Nombre Completo */}
          <div>
            <label htmlFor="field-fullName" className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Completo *
            </label>
            <div className="relative">
              <input
                id="field-fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                  handleValidateField('fullName', e.target.value);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 bg-white'
                }`}
                placeholder="Ej: Gabriela Chavez Aguilera"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            {errors.fullName && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.fullName}</p>
            )}
          </div>

          {/* Correo Electrónico */}
          <div>
            <label htmlFor="field-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Electrónico *
            </label>
            <div className="relative">
              <input
                id="field-email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }));
                  handleValidateField('email', e.target.value);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 bg-white'
                }`}
                placeholder="ejemplo@correo.com"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="field-phone" className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono Celular *
            </label>
            <div className="relative">
              <input
                id="field-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, phone: e.target.value }));
                  handleValidateField('phone', e.target.value);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 bg-white'
                }`}
                placeholder="Ej: 315 789 4521"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            {errors.phone && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.phone}</p>
            )}
          </div>

          {/* Ocupación / Programa Académico */}
          <div>
            <label htmlFor="field-occupation" className="block text-xs font-semibold text-slate-700 mb-1">
              Ocupación / Programa Académico *
            </label>
            <div className="relative">
              <input
                id="field-occupation"
                type="text"
                value={formData.occupation}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, occupation: e.target.value }));
                  handleValidateField('occupation', e.target.value);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${
                  errors.occupation
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 bg-white'
                }`}
                placeholder="Ej: Estudiante de Ingeniería Multimedia - UAO"
              />
              <Briefcase className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            {errors.occupation && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.occupation}</p>
            )}
          </div>

          {/* Alias / Llave de Pago */}
          <div className="sm:col-span-2">
            <label htmlFor="field-paymentAlias" className="block text-xs font-semibold text-slate-700 mb-1">
              Alias o Enlace para Pagos de Cuentas (Nequi, Daviplata, Bancolombia)
            </label>
            <div className="relative">
              <input
                id="field-paymentAlias"
                type="text"
                value={formData.paymentAlias}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentAlias: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white text-sm transition-colors focus:outline-none"
                placeholder="Ej: 3157894521 (Nequi) o gabriela.chavez@bancolombia"
              />
              <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tus compañeros de casa verán esta referencia al momento de reembolsarte o saldar cuentas.
            </p>
          </div>

          {/* Biografía / Notas de convivencia */}
          <div className="sm:col-span-2">
            <label htmlFor="field-bio" className="block text-xs font-semibold text-slate-700 mb-1">
              Biografía / Notas de Convivencia
            </label>
            <textarea
              id="field-bio"
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white text-sm transition-colors focus:outline-none"
              placeholder="Escribe brevemente sobre tus horarios, preferencias o responsabilidades acordadas en la vivienda..."
            />
          </div>
        </div>
      </div>

      {/* Sección 3: Parámetro Crítico de Ingreso Mensual*/}
      <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-2xl border-2 border-indigo-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Ingreso Mensual Individual Estimado *
              </h3>
              <p className="text-xs text-slate-500">
                Parámetro matemático para la distribución proporcional de gastos en Our House
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-md">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Prorrateo Equitativo</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div>
            <label htmlFor="field-monthlyIncome" className="block text-xs font-semibold text-slate-700 mb-1">
              Valor en pesos colombianos ($ COP) *
            </label>
            <div className="relative">
              <input
                id="field-monthlyIncome"
                type="text"
                value={rawIncome}
                onChange={handleIncomeChange}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-base font-bold transition-colors focus:outline-none focus:ring-2 ${
                  errors.monthlyIncome
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30 text-rose-900'
                    : 'border-indigo-300 focus:border-indigo-600 focus:ring-indigo-100 bg-white text-slate-900'
                }`}
                placeholder="2400000"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-indigo-600">
                COP
              </span>
            </div>
            {errors.monthlyIncome && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.monthlyIncome}</p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">Vista formateada:</span>
              <span className="text-xs font-black text-indigo-700">
                {formatCOP(Number(rawIncome) || 0)}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-indigo-100 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Transparencia de Datos</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Este dato no es divulgado con fines externos; se utiliza estrictamente dentro de la vivienda para que la plataforma pondere de forma equitativa el costo de los servicios y compras comunes.
            </p>
          </div>
        </div>
      </div>

      {/* Sección 4: Contacto de Emergencia */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-rose-500" />
          <span>Contacto de Emergencia Familiar / Cercano</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="field-emergencyContactName" className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de Persona de Contacto
            </label>
            <input
              id="field-emergencyContactName"
              type="text"
              value={formData.emergencyContactName}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, emergencyContactName: e.target.value }));
                handleValidateField('emergencyContactName', e.target.value);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${
                errors.emergencyContactName
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 bg-white'
              }`}
              placeholder="Ej: Carlos Chavez (Padre)"
            />
            {errors.emergencyContactName && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.emergencyContactName}</p>
            )}
          </div>

          <div>
            <label htmlFor="field-emergencyContactPhone" className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono del Contacto de Emergencia
            </label>
            <input
              id="field-emergencyContactPhone"
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, emergencyContactPhone: e.target.value }));
                handleValidateField('emergencyContactPhone', e.target.value);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 ${
                errors.emergencyContactPhone
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 bg-white'
              }`}
              placeholder="Ej: 312 456 7890"
            />
            {errors.emergencyContactPhone && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.emergencyContactPhone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sección 5: Preferencias de Notificaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <span>Preferencias de Alertas y Avisos del Hogar</span>
        </h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notificationPreferences.expenseAlerts}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notificationPreferences: {
                    ...prev.notificationPreferences,
                    expenseAlerts: e.target.checked,
                  },
                }))
              }
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">
                Notificarme cuando alguien registre un nuevo gasto compartido
              </span>
              <span className="text-slate-500">
                Recibe aviso inmediato para revisar la cuota asignada a tu cuenta.
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notificationPreferences.taskReminders}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notificationPreferences: {
                    ...prev.notificationPreferences,
                    taskReminders: e.target.checked,
                  },
                }))
              }
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">
                Recordatorios de tareas domésticas asignadas
              </span>
              <span className="text-slate-500">
                Aviso 24 horas antes del vencimiento de la fecha programada.
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notificationPreferences.settlementNotices}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notificationPreferences: {
                    ...prev.notificationPreferences,
                    settlementNotices: e.target.checked,
                  },
                }))
              }
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">
                Avisos de saldos a favor y liquidaciones
              </span>
              <span className="text-slate-500">
                Notificación cuando un roommate confirme el pago de una deuda pendiente.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Botones de acción finales */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Continuar y Confirmar Cambios</span>
        </button>
      </div>
    </form>
  );
};
