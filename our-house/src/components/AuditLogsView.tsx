import { History, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';
import type { ProfileAuditLog } from '../types';

interface AuditLogsViewProps {
  logs: ProfileAuditLog[];
  onResetToDefault: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  logs,
  onResetToDefault,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Historial de Modificaciones del Perfil
              </h2>
              <p className="text-xs text-slate-500">
                Registro de auditoría y trazabilidad de actualizaciones de datos personales
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onResetToDefault}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            title="Restablecer datos originales del charter"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer valores iniciales</span>
          </button>
        </div>

        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Actualización Confirmada</span>
                </span>
                <span className="text-xs text-slate-400">{log.timestamp}</span>
              </div>

              <p className="text-xs text-slate-600">{log.summary}</p>

              {log.changedFields.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {log.changedFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-white border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-slate-700">{field.field}:</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400 line-through truncate max-w-xs">
                          {field.oldValue}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-bold text-indigo-700 truncate max-w-xs">
                          {field.newValue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
