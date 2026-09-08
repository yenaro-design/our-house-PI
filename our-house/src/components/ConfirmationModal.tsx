import { ShieldCheck, ArrowRight, AlertCircle, Check, X } from 'lucide-react';
import type { UserProfile } from '../types';
import { formatCOP } from '../utils/formatters';

interface ConfirmationModalProps {
  currentProfile: UserProfile;
  updatedProfile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  currentProfile,
  updatedProfile,
  isOpen,
  onClose,
  onConfirm,
  isSaving,
}) => {
  if (!isOpen) return null;

  // Determinar los campos que sufrieron cambios
  const diffs: { label: string; oldVal: string; newVal: string; highlight?: boolean }[] = [];

  if (currentProfile.fullName !== updatedProfile.fullName) {
    diffs.push({
      label: 'Nombre Completo',
      oldVal: currentProfile.fullName,
      newVal: updatedProfile.fullName,
    });
  }

  if (currentProfile.email !== updatedProfile.email) {
    diffs.push({
      label: 'Correo Electrónico',
      oldVal: currentProfile.email,
      newVal: updatedProfile.email,
    });
  }

  if (currentProfile.phone !== updatedProfile.phone) {
    diffs.push({
      label: 'Teléfono Móvil',
      oldVal: currentProfile.phone,
      newVal: updatedProfile.phone,
    });
  }

  if (currentProfile.monthlyIncome !== updatedProfile.monthlyIncome) {
    diffs.push({
      label: 'Ingreso Mensual Individual',
      oldVal: formatCOP(currentProfile.monthlyIncome),
      newVal: formatCOP(updatedProfile.monthlyIncome),
      highlight: true,
    });
  }

  if (currentProfile.occupation !== updatedProfile.occupation) {
    diffs.push({
      label: 'Ocupación / Programa',
      oldVal: currentProfile.occupation,
      newVal: updatedProfile.occupation,
    });
  }

  if (currentProfile.paymentAlias !== updatedProfile.paymentAlias) {
    diffs.push({
      label: 'Alias de Pago (Nequi/Daviplata)',
      oldVal: currentProfile.paymentAlias || '(Vacío)',
      newVal: updatedProfile.paymentAlias || '(Vacío)',
    });
  }

  if (currentProfile.avatarColor !== updatedProfile.avatarColor) {
    diffs.push({
      label: 'Color de Insignia',
      oldVal: 'Color previo',
      newVal: 'Nuevo color seleccionado',
    });
  }

  if (currentProfile.bio !== updatedProfile.bio) {
    diffs.push({
      label: 'Biografía / Convivencia',
      oldVal: currentProfile.bio ? `"${currentProfile.bio.slice(0, 35)}..."` : '(Vacío)',
      newVal: updatedProfile.bio ? `"${updatedProfile.bio.slice(0, 35)}..."` : '(Vacío)',
    });
  }

  if (
    currentProfile.emergencyContactName !== updatedProfile.emergencyContactName ||
    currentProfile.emergencyContactPhone !== updatedProfile.emergencyContactPhone
  ) {
    diffs.push({
      label: 'Contacto de Emergencia',
      oldVal: `${currentProfile.emergencyContactName || 'N/A'} - ${currentProfile.emergencyContactPhone || 'N/A'}`,
      newVal: `${updatedProfile.emergencyContactName || 'N/A'} - ${updatedProfile.emergencyContactPhone || 'N/A'}`,
    });
  }

  const hasIncomeChanged = currentProfile.monthlyIncome !== updatedProfile.monthlyIncome;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Cabecera modal */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Confirmar Actualización de Perfil
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Valida los cambios antes de conservarlos en el sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo con Diff de Cambios */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {diffs.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-600">
              No detectamos modificaciones en tus campos personales respecto a los datos registrados.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resumen de campos modificados ({diffs.length}):
              </div>

              <div className="space-y-2">
                {diffs.map((diff, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border text-xs ${
                      diff.highlight
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="font-semibold mb-1 flex items-center justify-between">
                      <span>{diff.label}</span>
                      {diff.highlight && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded">
                          Impacto en Prorrateo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500 line-through truncate max-w-[140px]">
                        {diff.oldVal}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-900 truncate max-w-[180px]">
                        {diff.newVal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasIncomeChanged && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Aviso de impacto comunitario:</span>
                Al modificar tu ingreso mensual, las cuotas futuras de gastos compartidos en{' '}
                <span className="font-semibold">{currentProfile.dwellingName}</span> se calcularán
                con tu nuevo porcentaje relativo.
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 leading-relaxed">
            Al confirmar, la información actualizada se guardará en almacenamiento persistente y se
            reflejará de inmediato en todas las consultas de la plataforma.
          </div>
        </div>

        {/* Footer con botones */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Volver a revisar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Almacenando...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar y Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
