import { Home, User, ShieldCheck, DollarSign } from 'lucide-react';
import type { UserProfile } from '../types';
import { formatCOP } from '../utils/formatters';

interface NavbarProps {
  user: UserProfile;
  activeTab: 'profile' | 'proportional' | 'history';
  setActiveTab: (tab: 'profile' | 'proportional' | 'history') => void;
  isEditing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  isEditing,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y título del proyecto */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">Our House</span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs">
                {user.dwellingName}
              </p>
            </div>
          </div>

          {/* Navegación entre pestañas de la HU-03 */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Perfil Personal</span>
              {isEditing && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" title="En edición" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('proportional')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'proportional'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Impacto en Gastos</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Historial</span>
            </button>
          </nav>

          {/* Miniatura de usuario activo */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {user.fullName}
              </span>
              <span className="text-[11px] text-indigo-600 font-medium flex items-center justify-end gap-1">
                <span>Ingreso:</span>
                <span className="font-semibold">{formatCOP(user.monthlyIncome)}</span>
              </span>
            </div>

            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${user.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white`}
              title={`${user.fullName} (${user.dwellingRole})`}
            >
              {user.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          </div>
        </div>

        {/* Barra de pestañas móvil */}
        <div className="flex md:hidden border-t border-slate-200 py-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 bg-slate-100'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('proportional')}
            className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
              activeTab === 'proportional'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 bg-slate-100'
            }`}
          >
            Impacto
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 bg-slate-100'
            }`}
          >
            Historial
          </button>
        </div>
      </div>
    </header>
  );
};
