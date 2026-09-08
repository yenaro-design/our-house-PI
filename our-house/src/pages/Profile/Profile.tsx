import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Mail,
  DollarSign,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Edit3,
  Save,
  X,
  Copy,
  Check,
  Home,
  ShieldCheck,
  Calculator,
  LogOut,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  updateUserProfile,
  validateProfileData,
} from "../../services/userService";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();
  const { user, userProfile, loading, profileLoading, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Form State inicializado a partir de los datos autenticados
  const [nombre, setNombre] = useState(
    () => userProfile?.nombre || user?.displayName || ""
  );
  const [ingresoMensual, setIngresoMensual] = useState<string>(
    () =>
      userProfile?.ingresoMensual !== undefined
        ? String(userProfile.ingresoMensual)
        : "0"
  );
  const [telefono, setTelefono] = useState(
    () => userProfile?.telefono || ""
  );

  // Validation & Feedback State
  const [formErrors, setFormErrors] = useState<{
    nombre?: string;
    ingresoMensual?: string;
    telefono?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleCopyUid = async (uid: string) => {
    try {
      await navigator.clipboard.writeText(uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // Fallback
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleStartEdit = () => {
    // Restablecer valores actuales al entrar en modo edición
    if (userProfile) {
      setNombre(userProfile.nombre || "");
      setIngresoMensual(
        userProfile.ingresoMensual !== undefined
          ? String(userProfile.ingresoMensual)
          : "0"
      );
      setTelefono(userProfile.telefono || "");
    }
    setFormErrors({});
    setFeedback(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Revertir a los valores guardados
    if (userProfile) {
      setNombre(userProfile.nombre || "");
      setIngresoMensual(
        userProfile.ingresoMensual !== undefined
          ? String(userProfile.ingresoMensual)
          : "0"
      );
      setTelefono(userProfile.telefono || "");
    }
    setFormErrors({});
    setIsEditing(false);
  };

  const handleFieldChange = (
    field: "nombre" | "ingresoMensual" | "telefono",
    value: string
  ) => {
    if (field === "nombre") setNombre(value);
    if (field === "ingresoMensual") setIngresoMensual(value);
    if (field === "telefono") setTelefono(value);

    // Limpiar error en tiempo real para el campo modificado
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    if (!user) {
      setFeedback({
        type: "error",
        message: "Debes estar autenticado para actualizar tu perfil.",
      });
      return;
    }

    // 1. Validar integridad y formato
    const numericIncome = Number(ingresoMensual);
    const validation = validateProfileData({
      nombre,
      ingresoMensual: isNaN(numericIncome) ? -1 : numericIncome,
      telefono,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setFeedback({
        type: "error",
        message:
          "Por favor corrige los errores señalados antes de guardar los cambios.",
      });
      return;
    }

    // 2. Almacenar y conservar en Firestore
    try {
      setIsSaving(true);
      await updateUserProfile(user.uid, {
        nombre,
        ingresoMensual: numericIncome,
        telefono,
      });

      setIsEditing(false);
      setFormErrors({});
      setFeedback({
        type: "success",
        message:
          "¡Tu perfil ha sido actualizado exitosamente! La información ya está vigente en toda la plataforma.",
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado al actualizar el perfil.";
      setFeedback({
        type: "error",
        message: errorMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.warn("Aviso al cerrar sesión:", err);
    }
  };

  // Render inicial de carga
  if (loading) {
    return (
      <main className="profile-page">
        <div
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: "100svh",
            color: "var(--profile-muted)",
            gap: "12px",
          }}
        >
          <Loader2 className="animate-spin" size={36} />
          <p>Cargando información del perfil...</p>
        </div>
      </main>
    );
  }

  // Vista si no está autenticado
  if (!user) {
    return (
      <main className="profile-page">
        <header className="profile-header">
          <Link
            className="profile-brand"
            to="/"
            aria-label="Our House, página principal"
          >
            <span className="profile-brand-mark">OH</span>
            <span>our house</span>
          </Link>
        </header>

        <div className="profile-container">
          <div className="profile-guest-card">
            <div className="profile-guest-icon">
              <UserIcon size={32} />
            </div>
            <h2>Acceso Requerido</h2>
            <p>
              Debes iniciar sesión con tu cuenta para consultar y editar tus
              datos personales de perfil en Our House.
            </p>
            <div className="profile-guest-actions">
              <Link to="/login" className="btn-profile-primary">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="btn-profile-secondary">
                Crear Cuenta
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Iniciales del usuario
  const displayName =
    userProfile?.nombre || user.displayName || user.email?.split("@")[0] || "Usuario";
  const userInitials = displayName
    .split(" ")
    .map((word: string) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "OH";

  const formattedIncome = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(userProfile?.ingresoMensual ?? 0);

  return (
    <main className="profile-page">
      {/* Header superior */}
      <header className="profile-header">
        <Link
          className="profile-brand"
          to="/dashboard"
          aria-label="Our House, ir al panel principal"
        >
          <span className="profile-brand-mark">OH</span>
          <span>our house</span>
        </Link>

        <nav className="profile-nav" aria-label="Navegación principal">
          <Link className="profile-nav-link" to="/dashboard">
            Resumen
          </Link>
          <Link className="profile-nav-link" to="/dashboard#gastos">
            Gastos
          </Link>
          <Link className="profile-nav-link" to="/dashboard#tareas">
            Tareas
          </Link>
          <Link
            className="profile-nav-link profile-nav-link-active"
            to="/profile"
          >
            Perfil
          </Link>
        </nav>

        <div className="profile-user-badge">
          <span className="profile-avatar-small">{userInitials}</span>
          <span>{displayName}</span>
        </div>
      </header>

      <div className="profile-container">
        {/* Navegación de retorno */}
        <Link
          to="/dashboard"
          className="profile-back-link"
          aria-label="Volver al panel principal"
        >
          <ArrowLeft size={16} /> Volver al Dashboard
        </Link>

        {/* Notificaciones y Feedback */}
        {feedback && (
          <div
            className={`profile-alert profile-alert-${feedback.type}`}
            role="alert"
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
            )}
            <div>{feedback.message}</div>
            <button
              type="button"
              className="profile-alert-close"
              onClick={() => setFeedback(null)}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        )}

        {/* Tarjeta Hero del Perfil */}
        <section className="profile-hero" aria-label="Cabecera del perfil">
          <div className="profile-hero-main">
            <div className="profile-avatar-large">
              {userInitials}
              <span
                className="profile-avatar-badge"
                title="Cuenta verificada y activa"
              />
            </div>
            <div className="profile-hero-titles">
              <p
                style={{
                  margin: "0 0 4px",
                  color: "var(--profile-green)",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Perfil de Usuario
              </p>
              <h1>{displayName}</h1>
              <p className="profile-hero-subtitle">{user.email}</p>
              <div className="profile-tags">
                <span className="profile-pill profile-pill-verified">
                  <ShieldCheck size={13} /> Cuenta activa
                </span>
                <span className="profile-pill profile-pill-dwelling">
                  <Home size={13} />
                  {userProfile?.viviendaId
                    ? "Vivienda Vinculada"
                    : "Sin vivienda asignada"}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            {!isEditing ? (
              <button
                type="button"
                className="btn-profile-primary"
                onClick={handleStartEdit}
                id="btn-edit-profile"
              >
                <Edit3 size={15} /> Editar datos
              </button>
            ) : (
              <button
                type="button"
                className="btn-profile-secondary"
                onClick={handleCancelEdit}
                disabled={isSaving}
                id="btn-cancel-edit"
              >
                <X size={15} /> Cancelar edición
              </button>
            )}

            <button
              type="button"
              className="btn-profile-danger"
              onClick={handleLogout}
              id="btn-logout"
              title="Cerrar sesión de la cuenta"
            >
              <LogOut size={15} /> Salir
            </button>
          </div>
        </section>

        {/* Contenido principal en dos columnas */}
        <div className="profile-grid">
          {/* Columna Principal: Visualización o Edición */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                <UserIcon size={20} color="var(--profile-green)" />
                {isEditing ? "Modificar Datos Personales" : "Información Personal"}
              </h2>
              <span className="profile-card-badge">
                {isEditing ? "Modo Edición" : "Datos Registrados"}
              </span>
            </div>

            {isEditing ? (
              /* MODO EDICIÓN */
              <form
                className="profile-form"
                onSubmit={handleSaveProfile}
                noValidate
                id="form-edit-profile"
              >
                {/* Campo: Nombre */}
                <div className="profile-field">
                  <label htmlFor="input-nombre">
                    <span>Nombre completo *</span>
                    <span className="profile-field-badge">Obligatorio</span>
                  </label>
                  <div className="profile-input-wrapper">
                    <UserIcon size={16} className="profile-input-icon" />
                    <input
                      id="input-nombre"
                      type="text"
                      className={`profile-input ${
                        formErrors.nombre ? "profile-input-error" : ""
                      }`}
                      placeholder="Ej. Valentina Pérez"
                      value={nombre}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange("nombre", e.target.value)
                      }
                      disabled={isSaving}
                      required
                    />
                  </div>
                  {formErrors.nombre && (
                    <span className="profile-error-message" role="alert">
                      <AlertCircle size={13} /> {formErrors.nombre}
                    </span>
                  )}
                  <p className="profile-field-hint">
                    Tu nombre se utilizará en las asignaciones de tareas y en los
                    registros de gastos de la vivienda.
                  </p>
                </div>

                {/* Campo: Correo (Solo lectura) */}
                <div className="profile-field">
                  <label htmlFor="input-email">
                    <span>Correo electrónico</span>
                    <span className="profile-field-badge">Solo lectura</span>
                  </label>
                  <div className="profile-input-wrapper">
                    <Mail size={16} className="profile-input-icon" />
                    <input
                      id="input-email"
                      type="email"
                      className="profile-input profile-input-readonly"
                      value={user.email || ""}
                      readOnly
                      disabled
                    />
                  </div>
                  <p className="profile-field-hint">
                    El correo electrónico está vinculado a tus credenciales de
                    acceso seguras de Firebase Auth.
                  </p>
                </div>

                {/* Campo: Ingreso Mensual */}
                <div className="profile-field">
                  <label htmlFor="input-ingreso">
                    <span>Ingreso mensual estimado ($ COP) *</span>
                    <span className="profile-field-badge">Para prorrateo</span>
                  </label>
                  <div className="profile-input-wrapper">
                    <DollarSign size={16} className="profile-input-icon" />
                    <input
                      id="input-ingreso"
                      type="number"
                      min="0"
                      step="1000"
                      className={`profile-input ${
                        formErrors.ingresoMensual ? "profile-input-error" : ""
                      }`}
                      placeholder="0"
                      value={ingresoMensual}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange("ingresoMensual", e.target.value)
                      }
                      disabled={isSaving}
                      required
                    />
                  </div>
                  {formErrors.ingresoMensual && (
                    <span className="profile-error-message" role="alert">
                      <AlertCircle size={13} /> {formErrors.ingresoMensual}
                    </span>
                  )}
                  <p className="profile-field-hint">
                    Este valor es fundamental para
                    calcular tu cuota proporcional justa en los gastos compartidos.
                  </p>
                </div>

                {/* Campo: Teléfono */}
                <div className="profile-field">
                  <label htmlFor="input-telefono">
                    <span>Teléfono de contacto</span>
                    <span className="profile-field-badge">Opcional</span>
                  </label>
                  <div className="profile-input-wrapper">
                    <Phone size={16} className="profile-input-icon" />
                    <input
                      id="input-telefono"
                      type="tel"
                      className={`profile-input ${
                        formErrors.telefono ? "profile-input-error" : ""
                      }`}
                      placeholder="Ej. +57 300 123 4567"
                      value={telefono}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange("telefono", e.target.value)
                      }
                      disabled={isSaving}
                    />
                  </div>
                  {formErrors.telefono && (
                    <span className="profile-error-message" role="alert">
                      <AlertCircle size={13} /> {formErrors.telefono}
                    </span>
                  )}
                  <p className="profile-field-hint">
                    Facilita la comunicación directa entre los integrantes de la vivienda.
                  </p>
                </div>

                {/* Botones de acción del formulario */}
                <div className="profile-form-footer">
                  <button
                    type="button"
                    className="btn-profile-secondary"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X size={15} /> Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-profile-primary"
                    disabled={isSaving}
                    id="btn-submit-profile"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={16} /> Guardar cambios
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* MODO CONSULTA (VISUALIZACIÓN) */
              <div className="profile-view-grid" id="profile-details-view">
                <div className="profile-view-item">
                  <span className="profile-view-label">Nombre completo</span>
                  <span className="profile-view-value">
                    <UserIcon size={16} color="var(--profile-green)" />
                    {displayName}
                  </span>
                </div>

                <div className="profile-view-item">
                  <span className="profile-view-label">Correo electrónico</span>
                  <span className="profile-view-value">
                    <Mail size={16} color="var(--profile-green)" />
                    {user.email}
                  </span>
                </div>

                <div className="profile-view-item">
                  <span className="profile-view-label">
                    Ingreso mensual estimado (Base de Prorrateo)
                  </span>
                  <div className="profile-income-highlight">
                    {profileLoading ? (
                      <span style={{ fontSize: "14px", color: "var(--profile-muted)" }}>
                        Cargando...
                      </span>
                    ) : (
                      formattedIncome
                    )}
                  </div>
                </div>

                <div className="profile-view-item">
                  <span className="profile-view-label">Teléfono de contacto</span>
                  <span className="profile-view-value">
                    <Phone size={16} color="var(--profile-green)" />
                    {userProfile?.telefono ? (
                      userProfile.telefono
                    ) : (
                      <span style={{ color: "var(--profile-muted)", fontStyle: "italic", fontSize: "14px" }}>
                        No registrado (puedes agregarlo al editar)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Columna Lateral: Información de Integración del Proyecto */}
          <aside>
            <div className="profile-info-card">
              <h3>
                <Calculator size={17} color="var(--profile-green)" />
                Cálculo Proporcional
              </h3>
              <p>
                En <strong>Our House</strong>, los gastos del hogar pueden
                distribuirse de manera equitativa según los ingresos de cada
                habitante:
              </p>
              <div className="profile-formula-box">
                Ci = GastoTotal · (IngresoIndividual / TotalIngresos)
              </div>
              <p className="profile-formula-note">
                Mantener tu ingreso mensual actualizado garantiza que tu cuota
                asignada en cada compra sea siempre justa y matemáticamente exacta.
              </p>
            </div>

            <div className="profile-info-card">
              <h3>
                <ShieldCheck size={17} color="var(--profile-green)" />
                Seguridad e Integridad
              </h3>
              <p>
                Los datos se validan en el cliente y se almacenan de manera
                persistente en Google Cloud Firestore bajo tu identificador
                único de autenticación.
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--profile-green)", fontWeight: 600 }}>
                • Actualizaciones reactivas en tiempo real
                <br />
                • Sincronización instantánea con el Dashboard
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default Profile;
