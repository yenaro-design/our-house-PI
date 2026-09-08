import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User as UserIcon, LogOut, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";

const expenses = [
  { label: "Mercado del mes", detail: "Pagó Valentina", amount: "$186.400", tone: "green" },
  { label: "Servicio de internet", detail: "Pagó Tomás", amount: "$82.000", tone: "coral" },
  { label: "Productos de limpieza", detail: "Pagaste tú", amount: "$45.600", tone: "blue" },
];

const tasks = [
  { label: "Limpiar cocina", person: "Valentina", date: "Hoy", state: "Pendiente" },
  { label: "Sacar la basura", person: "Tú", date: "Mañana", state: "Pendiente" },
  { label: "Lavar baños", person: "Tomás", date: "Vie, 12 sep", state: "Programada" },
];

function Dashboard() {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName =
    userProfile?.nombre || user?.displayName || user?.email?.split("@")[0] || "Valentina Pérez";
  const firstName = displayName.split(" ")[0] || "Valentina";
  const userInitials =
    displayName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "VP";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="dashboard-brand" to="/dashboard" aria-label="Our House, página principal">
          <span className="dashboard-brand-mark">OH</span>
          <span>our house</span>
        </Link>

        <nav className="dashboard-nav" aria-label="Navegación principal">
          <a className="dashboard-nav-link dashboard-nav-link-active" href="#resumen">Resumen</a>
          <a className="dashboard-nav-link" href="#gastos">Gastos</a>
          <a className="dashboard-nav-link" href="#tareas">Tareas</a>
          <Link className="dashboard-nav-link" to="/profile">Perfil</Link>
        </nav>

        <div className="dashboard-user" ref={dropdownRef}>
          <button
            type="button"
            className="dashboard-user-button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-label="Abrir opciones de cuenta"
            id="btn-user-account"
          >
            <span className="dashboard-avatar">{userInitials}</span>
            <span className="dashboard-user-name">{displayName}</span>
            <span className="dashboard-menu" aria-hidden="true">•••</span>
          </button>

          {dropdownOpen && (
            <div className="dashboard-dropdown" role="menu">
              <Link
                to="/profile"
                className="dashboard-dropdown-item"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
                id="link-go-profile"
              >
                <UserIcon size={14} /> Mi Perfil (Editar datos)
              </Link>
              <Link
                to="/profile"
                className="dashboard-dropdown-item"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
              >
                <Settings size={14} /> Configuración de cuenta
              </Link>
              <hr style={{ margin: "4px 0", border: 0, borderTop: "1px solid var(--dashboard-line)" }} />
              <button
                type="button"
                className="dashboard-dropdown-item dashboard-dropdown-danger"
                onClick={handleLogout}
                role="menuitem"
                id="btn-menu-logout"
              >
                <LogOut size={14} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="dashboard-content" id="resumen">
        <div className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">Martes, 9 de septiembre</p>
            <h1>Buenos días, {firstName}.</h1>
            <p className="dashboard-subtitle">Este es el estado de <strong>Casa Arce</strong> esta semana.</p>
          </div>
          <button className="dashboard-primary-action" type="button"><span aria-hidden="true">+</span> Registrar gasto</button>
        </div>

        <div className="dashboard-stats" aria-label="Resumen de la vivienda">
          <article className="dashboard-stat dashboard-stat-featured">
            <div className="dashboard-stat-topline"><span>Tu saldo</span><span className="dashboard-status-dot" /></div>
            <strong>$32.800</strong>
            <p>A tu favor <span>↑ 12%</span> este mes</p>
          </article>
          <article className="dashboard-stat">
            <div className="dashboard-stat-topline"><span>Gastos del mes</span><span className="dashboard-stat-icon">$</span></div>
            <strong>$314.000</strong>
            <p>3 movimientos registrados</p>
          </article>
          <article className="dashboard-stat">
            <div className="dashboard-stat-topline"><span>Tareas pendientes</span><span className="dashboard-stat-icon">✓</span></div>
            <strong>2</strong>
            <p>1 vence hoy</p>
          </article>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section dashboard-expenses" id="gastos" aria-labelledby="expenses-title">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-eyebrow">Actividad económica</p>
                <h2 id="expenses-title">Últimos gastos</h2>
              </div>
              <a href="#gastos">Ver todos</a>
            </div>
            <div className="dashboard-list">
              {expenses.map((expense) => (
                <article className="dashboard-list-row" key={expense.label}>
                  <span className={`dashboard-expense-icon dashboard-expense-icon-${expense.tone}`}>$</span>
                  <div className="dashboard-list-copy"><strong>{expense.label}</strong><span>{expense.detail}</span></div>
                  <strong className="dashboard-list-amount">{expense.amount}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-section dashboard-tasks" id="tareas" aria-labelledby="tasks-title">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-eyebrow">Organización de la casa</p>
                <h2 id="tasks-title">Próximas tareas</h2>
              </div>
              <a href="#tareas">Ver todas</a>
            </div>
            <div className="dashboard-list">
              {tasks.map((task) => (
                <article className="dashboard-list-row dashboard-task-row" key={task.label}>
                  <span className="dashboard-task-check" aria-hidden="true" />
                  <div className="dashboard-list-copy"><strong>{task.label}</strong><span>{task.person} · {task.date}</span></div>
                  <span className={`dashboard-task-state dashboard-task-state-${task.state === "Pendiente" ? "pending" : "scheduled"}`}>{task.state}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
