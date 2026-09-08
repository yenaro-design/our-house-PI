import { LogOut, X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { UserProfile } from '../types';
import { formatCOP } from '../utils/formatters';

interface ExitDwellingModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSimulateZeroBalance: () => void;
}

export const ExitDwellingModal: React.FC<ExitDwellingModalProps> = ({
  user,
  isOpen,
  onClose,
  onSimulateZeroBalance,
}) => {
  if (!isOpen) return null;

  const isBalanceZero = user.currentBalance === 0;
  const hasNoPendingTasks = user.pendingTasksCount === 0;
  const canExit = isBalanceZero && hasNoPendingTasks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Salida Voluntaria de la Vivienda
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Validación de condiciones para desvincularse del hogar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
            <span className="font-semibold block text-slate-900 mb-1">
              Condiciones de salida del hogar:
            </span>
            Para proteger a los demás roommates, el sistema solo permite abandonar la vivienda si el saldo
            consolidado del usuario es exactamente <strong>$0 COP</strong> y no posee tareas domésticas pendientes.
          </div>

          <div className="space-y-2.5">
            {/* Validación 1: Saldo */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isBalanceZero
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {isBalanceZero ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div>
                  <span className="font-semibold block">Condición 1: Saldo en $0 COP</span>
                  <span className="text-[11px] opacity-80">
                    Tu saldo actual: {formatCOP(user.currentBalance)}
                  </span>
                </div>
              </div>
              <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-white/70">
                {isBalanceZero ? 'Cumplido' : 'Pendiente'}
              </span>
            </div>

            {/* Validación 2: Tareas */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                hasNoPendingTasks
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {hasNoPendingTasks ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div>
                  <span className="font-semibold block">Condición 2: Cero tareas asignadas</span>
                  <span className="text-[11px] opacity-80">
                    Tienes {user.pendingTasksCount} tarea(s) pendiente(s)
                  </span>
                </div>
              </div>
              <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-white/70">
                {hasNoPendingTasks ? 'Cumplido' : 'Pendiente'}
              </span>
            </div>
          </div>

          {!canExit && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Desvinculación bloqueada por el sistema:</span>
                Debes primero liquidar saldos con tus compañeros o completar tus tareas domésticas.
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSimulateZeroBalance}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer"
          >
            {user.currentBalance === 0 && user.pendingTasksCount === 0
              ? 'Restablecer saldo/tareas de prueba'
              : 'Simular saldo $0 y tareas al día (Demo)'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={!canExit}
              onClick={() => {
                alert('¡Condiciones cumplidas! La solicitud de desvinculación se ha procesado con éxito.');
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar Salida
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
