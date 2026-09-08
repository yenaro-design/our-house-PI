import { useState, useEffect } from 'react';
import type { UserProfile, ProfileAuditLog } from './types';
import {
  INITIAL_USER_PROFILE,
  INITIAL_ROOMMATES,
  INITIAL_AUDIT_LOGS,
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { ProfileView } from './components/ProfileView';
import { ProfileEditForm } from './components/ProfileEditForm';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ProportionalImpactWidget } from './components/ProportionalImpactWidget';
import { AuditLogsView } from './components/AuditLogsView';
import { ExitDwellingModal } from './components/ExitDwellingModal';
import { CheckCircle2, X } from 'lucide-react';
import { formatCOP } from './utils/formatters';

const STORAGE_KEY_PROFILE = 'our_house_user_profile_v1';
const STORAGE_KEY_LOGS = 'our_house_profile_audit_logs_v1';

export function App() {
  // 1. Cargar perfil persistido o valor inicial
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_USER_PROFILE;
  });

  // 2. Historial de auditoría persistido
  const [auditLogs, setAuditLogs] = useState<ProfileAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_AUDIT_LOGS;
  });

  // 3. Estados de navegación y modales
  const [activeTab, setActiveTab] = useState<'profile' | 'proportional' | 'history'>('profile');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [pendingProfileUpdate, setPendingProfileUpdate] = useState<UserProfile | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Guardar en localStorage ante cualquier cambio de estado confirmado
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(user));
    } catch (e) {
      console.error('Error al persistir perfil:', e);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Error al persistir logs de auditoría:', e);
    }
  }, [auditLogs]);

  // Manejador de solicitud de guardado desde el formulario (abre confirmación)
  const handleRequestSave = (updated: UserProfile) => {
    setPendingProfileUpdate(updated);
    setIsConfirmModalOpen(true);
  };

  // Confirmar y almacenar definitivamente la información (Criterio 4 y 5 de HU-03)
  const handleConfirmSave = () => {
    if (!pendingProfileUpdate) return;
    setIsSaving(true);

    setTimeout(() => {
      // Detectar campos modificados para el log de auditoría
      const changes: { field: string; oldValue: string; newValue: string }[] = [];

      if (user.fullName !== pendingProfileUpdate.fullName) {
        changes.push({
          field: 'Nombre Completo',
          oldValue: user.fullName,
          newValue: pendingProfileUpdate.fullName,
        });
      }
      if (user.email !== pendingProfileUpdate.email) {
        changes.push({
          field: 'Correo Electrónico',
          oldValue: user.email,
          newValue: pendingProfileUpdate.email,
        });
      }
      if (user.phone !== pendingProfileUpdate.phone) {
        changes.push({
          field: 'Teléfono Móvil',
          oldValue: user.phone,
          newValue: pendingProfileUpdate.phone,
        });
      }
      if (user.monthlyIncome !== pendingProfileUpdate.monthlyIncome) {
        changes.push({
          field: 'Ingreso mensual individual',
          oldValue: formatCOP(user.monthlyIncome),
          newValue: formatCOP(pendingProfileUpdate.monthlyIncome),
        });
      }
      if (user.occupation !== pendingProfileUpdate.occupation) {
        changes.push({
          field: 'Ocupación',
          oldValue: user.occupation,
          newValue: pendingProfileUpdate.occupation,
        });
      }
      if (user.emergencyContactName !== pendingProfileUpdate.emergencyContactName) {
        changes.push({
          field: 'Contacto de Emergencia',
          oldValue: user.emergencyContactName || 'N/A',
          newValue: pendingProfileUpdate.emergencyContactName || 'N/A',
        });
      }

      const nowFormatted = new Date().toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const updatedWithTimestamp: UserProfile = {
        ...pendingProfileUpdate,
        lastUpdatedAt: nowFormatted,
      };

      // Si hubo cambios, agregar al registro de auditoría
      if (changes.length > 0) {
        const newLog: ProfileAuditLog = {
          id: `log_${Date.now()}`,
          timestamp: `Hoy - ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`,
          changedFields: changes,
          summary: `Actualización de perfil: ${changes.map((c) => c.field).join(', ')}.`,
        };
        setAuditLogs((prev) => [newLog, ...prev]);
      }

      // Actualizar estado del perfil (se refleja inmediatamente en toda la app)
      setUser(updatedWithTimestamp);
      setIsSaving(false);
      setIsConfirmModalOpen(false);
      setIsEditing(false);
      setPendingProfileUpdate(null);

      // Toast feedback
      setToastMessage('¡Perfil actualizado con éxito! Los datos se han guardado e impactan de inmediato en la vivienda.');
      setTimeout(() => setToastMessage(null), 5000);
    }, 400);
  };

  // Restablecer a los valores por defecto del Project Charter
  const handleResetToDefault = () => {
    if (window.confirm('¿Deseas restablecer el perfil a los datos originales del Project Charter?')) {
      setUser(INITIAL_USER_PROFILE);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setIsEditing(false);
      setToastMessage('Valores de perfil restablecidos.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Simular saldo cero para prueba de salida voluntaria (RF20)
  const handleToggleZeroBalance = () => {
    if (user.currentBalance === 0 && user.pendingTasksCount === 0) {
      setUser((prev) => ({ ...prev, currentBalance: 45000, pendingTasksCount: 1 }));
    } else {
      setUser((prev) => ({ ...prev, currentBalance: 0, pendingTasksCount: 0 }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Barra de Navegación Principal */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        isEditing={isEditing}
      />

      {/* Banner / Toast de confirmación de guardado */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 shadow-md flex items-center justify-between text-xs sm:text-sm font-medium animate-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 w-full">
            <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-100 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'profile' && (
          <>
            {isEditing ? (
              <ProfileEditForm
                initialProfile={user}
                onCancel={() => setIsEditing(false)}
                onRequestSave={handleRequestSave}
              />
            ) : (
              <ProfileView
                user={user}
                onEdit={() => setIsEditing(true)}
                onOpenExitModal={() => setIsExitModalOpen(true)}
                onViewProportional={() => setActiveTab('proportional')}
              />
            )}
          </>
        )}

        {activeTab === 'proportional' && (
          <ProportionalImpactWidget
            user={user}
            roommates={INITIAL_ROOMMATES}
            onEditProfile={() => {
              setActiveTab('profile');
              setIsEditing(true);
            }}
          />
        )}

        {activeTab === 'history' && (
          <AuditLogsView
            logs={auditLogs}
            onResetToDefault={handleResetToDefault}
          />
        )}
      </main>

      {/* Modal de Confirmación antes de Guardar (Criterio 4: confirmación y almacenamiento) */}
      {pendingProfileUpdate && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          currentProfile={user}
          updatedProfile={pendingProfileUpdate}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmSave}
          isSaving={isSaving}
        />
      )}

      {/* Modal de Salida Voluntaria de Vivienda (RF20 / HU09 desde el perfil) */}
      <ExitDwellingModal
        isOpen={isExitModalOpen}
        user={user}
        onClose={() => setIsExitModalOpen(false)}
        onSimulateZeroBalance={handleToggleZeroBalance}
      />

      {/* Footer del Proyecto */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Our House</span>
            <span>— Plataforma de Convivencia y Gastos Compartidos</span>
          </div>
          <p className="text-slate-400">
            Perfil de Usuario y Distribución Equitativa de Gastos
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
