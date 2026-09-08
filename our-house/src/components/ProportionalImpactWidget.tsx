import { useState } from 'react';
import { Calculator, ArrowRight, PieChart, Sparkles } from 'lucide-react';
import type { UserProfile, RoommateMember } from '../types';
import { formatCOP, calculateProportionalShare } from '../utils/formatters';

interface ProportionalImpactWidgetProps {
  user: UserProfile;
  roommates: RoommateMember[];
  onEditProfile: () => void;
}

const COMMON_EXPENSES = [
  { id: 'exp_01', concept: 'Arriendo mensual del inmueble', amount: 2200000 },
  { id: 'exp_02', concept: 'Servicios públicos (Agua, Energía, Gas)', amount: 380000 },
  { id: 'exp_03', concept: 'Internet de fibra óptica y streaming', amount: 130000 },
  { id: 'exp_04', concept: 'Mercado básico comunitario', amount: 550000 },
];

export const ProportionalImpactWidget: React.FC<ProportionalImpactWidgetProps> = ({
  user,
  roommates,
  onEditProfile,
}) => {
  const [selectedExpense, setSelectedExpense] = useState(COMMON_EXPENSES[0]);
  const [customAmount, setCustomAmount] = useState<string>(String(selectedExpense.amount));

  // Actualizar el ingreso del usuario en la lista de roommates para reflejar cambios inmediatos
  const activeRoommates = roommates.map((rm) =>
    rm.id === user.id ? { ...rm, monthlyIncome: user.monthlyIncome, name: `${user.fullName} (Tú)` } : rm
  );

  const totalHouseholdIncome = activeRoommates.reduce((acc, curr) => acc + curr.monthlyIncome, 0);
  const expenseAmountNumber = Number(customAmount) || 0;

  const userShare = calculateProportionalShare(
    expenseAmountNumber,
    user.monthlyIncome,
    activeRoommates.map((r) => r.monthlyIncome)
  );

  return (
    <div className="space-y-6">
      {/* Banner Explicativo del Requisito RF03 / RF08 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Impacto del Ingreso en los Gastos de la Vivienda
              </h2>
              <p className="text-xs text-slate-500">
                Así impacta tu dato de ingreso mensual en el cálculo equitativo de los gastos compartidos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Ajustar mi ingreso en el perfil</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fórmulas y Estado actual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider block mb-1">
              Tu Ingreso en Perfil
            </span>
            <div className="text-2xl font-black text-indigo-700">
              {formatCOP(user.monthlyIncome)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Dato editable desde tu perfil personal
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider block mb-1">
              Ingreso Total del Hogar
            </span>
            <div className="text-2xl font-black text-slate-900">
              {formatCOP(totalHouseholdIncome)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Suma de los 4 integrantes de la vivienda
            </span>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
            <span className="text-xs text-indigo-900 uppercase font-semibold tracking-wider block mb-1 flex items-center gap-1">
              <PieChart className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tu Peso Relativo en Gastos</span>
            </span>
            <div className="text-2xl font-black text-indigo-700">
              {userShare.percentage}%
            </div>
            <span className="text-xs text-indigo-800/80 mt-1 block">
              Porcentaje asignado a tus cuotas individuales
            </span>
          </div>
        </div>
      </div>

      {/* Simulador Interactivo de Gastos Compartidos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Simulador de Cuota según Gasto Registrado</span>
        </h3>

        {/* Selector de gastos frecuentes */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-600 block mb-2">
            Selecciona un concepto común o escribe un monto:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMMON_EXPENSES.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => {
                  setSelectedExpense(exp);
                  setCustomAmount(String(exp.amount));
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedExpense.id === exp.id
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {exp.concept}
                </div>
                <div className="text-xs text-indigo-700 font-bold mt-1">
                  {formatCOP(exp.amount)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input para monto personalizado */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-1/2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monto total del gasto a prorratear ($ COP):
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedExpense({ id: 'custom', concept: 'Gasto personalizado', amount: Number(e.target.value) || 0 });
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                COP
              </span>
            </div>
          </div>

          <div className="w-full sm:w-1/2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <div className="text-slate-500">Tu cuota calculada automáticamente:</div>
            <div className="text-xl font-black text-emerald-600">
              {formatCOP(userShare.shareAmount)}
            </div>
            <div className="text-[11px] text-slate-400">
              Equivale exactamente al {userShare.percentage}% de {formatCOP(expenseAmountNumber)}
            </div>
          </div>
        </div>

        {/* Tabla comparativa entre los integrantes de la vivienda */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Distribución proporcional entre los integrantes de la vivienda:
          </h4>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {activeRoommates.map((roommate) => {
              const share = calculateProportionalShare(
                expenseAmountNumber,
                roommate.monthlyIncome,
                activeRoommates.map((r) => r.monthlyIncome)
              );
              const isCurrentUser = roommate.id === user.id;

              return (
                <div
                  key={roommate.id}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isCurrentUser ? 'bg-indigo-50/50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${roommate.avatarColor} text-white font-bold flex items-center justify-center shrink-0`}
                    >
                      {roommate.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{roommate.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded">
                            TÚ
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500">
                        Ingreso registrado: {formatCOP(roommate.monthlyIncome)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Porcentaje
                      </span>
                      <span className="font-bold text-slate-700">{share.percentage}%</span>
                    </div>

                    <div className="min-w-[110px]">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Cuota a pagar
                      </span>
                      <span className="font-black text-sm text-slate-900">
                        {formatCOP(share.shareAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
