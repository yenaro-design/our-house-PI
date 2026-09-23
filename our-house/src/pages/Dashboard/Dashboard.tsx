import { useState, useRef, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  LogOut,
  Home,
  Key,
  Copy,
  Check,
  Plus,
  Filter,
  RotateCcw,
  CheckSquare,
  Square,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Trash2,
  DoorOpen,
  Eye,
  X,
  Loader2,
  Info,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  obtenerViviendaPorId,
  obtenerIntegrantesVivienda,
  retirarIntegrante,
  abandonarVivienda,
  crearVivienda,
  unirseAVivienda,
} from "../../services/dwellingService";
import {
  obtenerGastosPorVivienda,
  registrarGasto,
  filtrarGastos,
  calcularSaldosConsolidados,
  calcularDistribucionProporcional,
} from "../../services/expenseService";
import {
  obtenerTareasPorVivienda,
  crearTarea,
  toggleCompletarTarea,
} from "../../services/taskService";
import { guardarIngresoMensual } from "../../services/ingresoService";
import type { Dwelling } from "../../models/Dwelling";
import type { User } from "../../models/User";
import type { Expense } from "../../models/Expense";
import type { Task } from "../../models/Task";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { user, userProfile, logout, refreshUserProfile } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // App Main State
  const [activeTab, setActiveTab] = useState<"resumen" | "gastos" | "integrantes" | "tareas">("resumen");
  const [dwelling, setDwelling] = useState<Dwelling | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State (HU12)
  const [busqueda, setBusqueda] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtroPagador, setFiltroPagador] = useState("todos");

  // Modals
  const [modalGastoOpen, setModalGastoOpen] = useState(false);
  const [modalTareaOpen, setModalTareaOpen] = useState(false);
  const [modalIngresoOpen, setModalIngresoOpen] = useState(false);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<Expense | null>(null);

  // Feedback & Copy State
  const [copiedCode, setCopiedCode] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Expense Form State (HU10, HU11)
  const [gastoConcepto, setGastoConcepto] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [gastoPagadorId, setGastoPagadorId] = useState("");
  const [gastoParticipantes, setGastoParticipantes] = useState<string[]>([]);
  const [gastoCategoria, setGastoCategoria] = useState("Mercado");
  const [gastoFecha, setGastoFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  // Task Form State
  const [tareaTitulo, setTareaTitulo] = useState("");
  const [tareaDescripcion, setTareaDescripcion] = useState("");
  const [tareaResponsableId, setTareaResponsableId] = useState("");
  const [tareaFecha, setTareaFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  // Quick Income Form State (HU04)
  const [nuevoIngresoInput, setNuevoIngresoInput] = useState("");
  const [guardandoIngreso, setGuardandoIngreso] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch dwelling data and related entities
  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      const vId = userProfile?.viviendaId;
      if (!vId) {
        if (isSubscribed) {
          setDwelling(null);
          setMembers([]);
          setExpenses([]);
          setTasks([]);
          setLoading(false);
        }
        return;
      }

      try {
        const d = await obtenerViviendaPorId(vId);
        if (!isSubscribed) return;
        setDwelling(d);

        if (d) {
          const [integrantes, gastosList, tareasList] = await Promise.all([
            obtenerIntegrantesVivienda(d.id),
            obtenerGastosPorVivienda(d.id),
            obtenerTareasPorVivienda(d.id),
          ]);
          if (!isSubscribed) return;
          setMembers(integrantes);
          setExpenses(gastosList);
          setTasks(tareasList);

          // Pre-fill default payer and participants
          if (user) {
            setGastoPagadorId(user.uid);
            setGastoParticipantes(integrantes.map((m) => m.id));
            setTareaResponsableId(user.uid);
          }
        }
      } catch (err) {
        console.warn("Error al cargar datos del hogar:", err);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [userProfile?.viviendaId, user]);

  // Consolidated Balances across all members
  const saldosConsolidados = useMemo(() => {
    return calcularSaldosConsolidados(expenses, members);
  }, [expenses, members]);

  // Current user's balance
  const userSaldo = useMemo(() => {
    if (!user) return 0;
    return saldosConsolidados[user.uid] || 0;
  }, [saldosConsolidados, user]);

  // Total household expenses
  const totalGastosMes = useMemo(() => {
    return expenses.reduce((acc, g) => acc + g.monto, 0);
  }, [expenses]);

  // Filtered Expenses (HU12)
  const gastosFiltrados = useMemo(() => {
    return filtrarGastos(expenses, {
      busqueda,
      fechaInicio,
      fechaFin,
      pagadorId: filtroPagador,
    });
  }, [expenses, busqueda, fechaInicio, fechaFin, filtroPagador]);

  // Live calculation preview for expense modal (HU11)
  const calculoEnVivo = useMemo(() => {
    const monto = Number(gastoMonto);
    if (isNaN(monto) || monto <= 0 || gastoParticipantes.length === 0) {
      return null;
    }
    const participantesUsers = members.filter((m) => gastoParticipantes.includes(m.id));
    return calcularDistribucionProporcional(monto, gastoPagadorId, participantesUsers);
  }, [gastoMonto, gastoPagadorId, gastoParticipantes, members]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleResetFilters = () => {
    setBusqueda("");
    setFechaInicio("");
    setFechaFin("");
    setFiltroPagador("todos");
  };

  const handleOpenGastoModal = () => {
    if (members.length === 0) {
      setActionError("Debes tener una vivienda con integrantes para registrar gastos.");
      return;
    }
    setGastoConcepto("");
    setGastoMonto("");
    setGastoPagadorId(user?.uid || members[0]?.id || "");
    setGastoParticipantes(members.map((m) => m.id));
    setGastoCategoria("Mercado");
    setGastoFecha(new Date().toISOString().split("T")[0]);
    setActionError(null);
    setModalGastoOpen(true);
  };

  const handleToggleParticipante = (userId: string) => {
    setGastoParticipantes((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleGuardarGasto = async (e: FormEvent) => {
    e.preventDefault();
    if (!dwelling || !user) return;
    setActionError(null);

    const monto = Number(gastoMonto);
    if (!gastoConcepto.trim()) {
      setActionError("El concepto del gasto es obligatorio.");
      return;
    }
    if (isNaN(monto) || monto <= 0) {
      setActionError("El monto debe ser un número mayor a cero.");
      return;
    }
    if (!gastoPagadorId) {
      setActionError("Selecciona el pagador del gasto.");
      return;
    }
    if (gastoParticipantes.length === 0) {
      setActionError("Debes seleccionar al menos un participante.");
      return;
    }

    try {
      setGuardandoGasto(true);
      const pagador = members.find((m) => m.id === gastoPagadorId);
      const nuevo = await registrarGasto(
        {
          viviendaId: dwelling.id,
          concepto: gastoConcepto.trim(),
          monto,
          pagadorId: gastoPagadorId,
          pagadorNombre: pagador?.nombre || "Integrante",
          participantes: gastoParticipantes,
          fecha: gastoFecha,
          categoria: gastoCategoria,
        },
        members
      );

      setExpenses((prev) => [nuevo, ...prev]);
      setModalGastoOpen(false);
      setActionSuccess(`Gasto "${nuevo.concepto}" registrado con distribución proporcional exacta.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al registrar el gasto.");
    } finally {
      setGuardandoGasto(false);
    }
  };

  const handleGuardarTarea = async (e: FormEvent) => {
    e.preventDefault();
    if (!dwelling) return;
    setActionError(null);

    if (!tareaTitulo.trim()) {
      setActionError("El título de la tarea es obligatorio.");
      return;
    }
    if (!tareaResponsableId) {
      setActionError("Selecciona un responsable para la tarea.");
      return;
    }

    try {
      setGuardandoTarea(true);
      const resp = members.find((m) => m.id === tareaResponsableId);
      const nueva = await crearTarea({
        viviendaId: dwelling.id,
        titulo: tareaTitulo.trim(),
        descripcion: tareaDescripcion.trim(),
        responsableId: tareaResponsableId,
        responsableNombre: resp?.nombre || "Integrante",
        fechaVencimiento: tareaFecha,
      });

      setTasks((prev) => [...prev, nueva]);
      setModalTareaOpen(false);
      setTareaTitulo("");
      setTareaDescripcion("");
      setActionSuccess("Tarea asignada correctamente.");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al guardar la tarea.");
    } finally {
      setGuardandoTarea(false);
    }
  };

  const handleToggleTask = async (taskId: string, current: boolean) => {
    try {
      await toggleCompletarTarea(taskId, !current);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completada: !current } : t))
      );
    } catch (e) {
      console.warn("Error al actualizar tarea:", e);
    }
  };

  // HU08: Retiro de un integrante por el administrador con validación de saldo $0
  const handleRetirarIntegrante = async (member: User) => {
    if (!dwelling || !user) return;
    setActionError(null);
    setActionSuccess(null);

    const saldo = saldosConsolidados[member.id] || 0;
    if (Math.abs(saldo) > 0.01) {
      const tipo = saldo > 0 ? "saldo a favor" : "deuda pendiente";
      const montoFormato = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(Math.abs(saldo));
      setActionError(
        `Acción bloqueada: No es posible retirar a "${member.nombre}". Posee un ${tipo} de ${montoFormato}. El saldo debe ser exactamente $0 COP para autorizar el retiro.`
      );
      return;
    }

    const conf = window.confirm(
      `¿Estás seguro de que deseas retirar a ${member.nombre} de la vivienda? Su saldo está verificado en $0.`
    );
    if (!conf) return;

    try {
      await retirarIntegrante(dwelling.id, user.uid, member.id, saldo);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setActionSuccess(`El integrante "${member.nombre}" ha sido retirado de la vivienda exitosamente.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al retirar integrante.");
    }
  };

  // HU09: Salida voluntaria de la vivienda con validación de saldo $0 y 0 tareas pendientes
  const handleAbandonarViviendaPropia = async () => {
    if (!dwelling || !user) return;
    setActionError(null);
    setActionSuccess(null);

    const pendingChores = tasks
      .filter((t) => t.responsableId === user.uid && !t.completada)
      .map((t) => t.titulo);

    if (Math.abs(userSaldo) > 0.01) {
      const tipo = userSaldo > 0 ? "saldo a favor" : "deuda pendiente";
      const montoFormato = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(Math.abs(userSaldo));
      setActionError(
        `No puedes abandonar la vivienda: Tienes un ${tipo} de ${montoFormato}. Debes estar a paz y salvo ($0 COP) antes de desvincularte.`
      );
      return;
    }

    if (pendingChores.length > 0) {
      setActionError(
        `No puedes abandonar la vivienda: Tienes ${pendingChores.length} tarea(s) pendiente(s) asignada(s) (${pendingChores.join(
          ", "
        )}). Debes completarlas antes de salir.`
      );
      return;
    }

    const conf = window.confirm("¿Confirmas que deseas salir de esta vivienda?");
    if (!conf) return;

    try {
      await abandonarVivienda(dwelling.id, user.uid, userSaldo, pendingChores.length, pendingChores);
      await refreshUserProfile();
      setDwelling(null);
      setMembers([]);
      setExpenses([]);
      setTasks([]);
      setActionSuccess("Has abandonado la vivienda correctamente.");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al abandonar la vivienda.");
    }
  };

  // HU04: Guardar o actualizar ingreso mensual desde el dashboard
  const handleGuardarIngreso = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const valor = Number(nuevoIngresoInput);
    if (isNaN(valor) || valor <= 0) {
      setActionError("El ingreso mensual debe ser un número positivo mayor a cero (> 0).");
      return;
    }

    try {
      setGuardandoIngreso(true);
      await guardarIngresoMensual(user.uid, valor);
      await refreshUserProfile();
      setMembers((prev) =>
        prev.map((m) => (m.id === user.uid ? { ...m, ingresoMensual: valor } : m))
      );
      setModalIngresoOpen(false);
      setActionSuccess(
        `Ingreso mensual actualizado a ${new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(valor)}. Los cálculos proporcionales futuros emplearán este monto.`
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al guardar el ingreso.");
    } finally {
      setGuardandoIngreso(false);
    }
  };

  // Seed demo data helper for immediate verification
  const handleSeedDemoData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const d = await crearVivienda(
        { nombre: "Casa Los Cedros", direccion: "Calle 140 # 15-28" },
        user.uid
      );

      // Save user income (HU04)
      await guardarIngresoMensual(user.uid, 3500000);

      // Add two mock roommates
      const mate1: User = {
        id: "mate-1-" + Date.now(),
        nombre: "Tomás Henao",
        email: "tomas.henao@correo.com",
        ingresoMensual: 2500000,
        telefono: "3104567890",
        viviendaId: d.id,
      };
      const mate2: User = {
        id: "mate-2-" + Date.now(),
        nombre: "Sofía Arango",
        email: "sofia.arango@correo.com",
        ingresoMensual: 4000000,
        telefono: "3119876543",
        viviendaId: d.id,
      };

      // Add roommates to dwelling local
      await unirseAVivienda(d.id, mate1.id);
      await unirseAVivienda(d.id, mate2.id);

      const allMembers = [
        {
          id: user.uid,
          nombre: userProfile?.nombre || user.displayName || "Valentina Pérez",
          email: user.email || "valentina@correo.com",
          ingresoMensual: 3500000,
          telefono: userProfile?.telefono || "3001234567",
          viviendaId: d.id,
        },
        mate1,
        mate2,
      ];

      // Create initial demo shared expenses (HU10, HU11)
      await registrarGasto(
        {
          viviendaId: d.id,
          concepto: "Mercado quincenal Carulla",
          monto: 300000,
          pagadorId: user.uid,
          pagadorNombre: allMembers[0].nombre,
          participantes: allMembers.map((m) => m.id),
          fecha: new Date().toISOString().split("T")[0],
          categoria: "Mercado",
        },
        allMembers
      );

      await registrarGasto(
        {
          viviendaId: d.id,
          concepto: "Factura de Internet Claro",
          monto: 120000,
          pagadorId: mate1.id,
          pagadorNombre: mate1.nombre,
          participantes: allMembers.map((m) => m.id),
          fecha: new Date().toISOString().split("T")[0],
          categoria: "Servicios",
        },
        allMembers
      );

      // Create initial tasks
      await crearTarea({
        viviendaId: d.id,
        titulo: "Sacar reciclaje y residuos",
        descripcion: "Martes y viernes por la mañana",
        responsableId: user.uid,
        responsableNombre: allMembers[0].nombre,
        fechaVencimiento: new Date().toISOString().split("T")[0],
      });

      await crearTarea({
        viviendaId: d.id,
        titulo: "Limpieza profunda de la cocina",
        descripcion: "Limpiar nevera y estufa",
        responsableId: mate1.id,
        responsableNombre: mate1.nombre,
        fechaVencimiento: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      });

      await refreshUserProfile();
      setActionSuccess("¡Vivienda y datos de demostración creados exitosamente!");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error al crear demostración.");
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    userProfile?.nombre || user?.displayName || user?.email?.split("@")[0] || "Usuario";
  const firstName = displayName.split(" ")[0];
  const userInitials =
    displayName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OH";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <main className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <Link className="dashboard-brand" to="/dashboard" aria-label="Our House, página principal">
          <span className="dashboard-brand-mark">OH</span>
          <span>our house</span>
        </Link>

        <nav className="dashboard-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={`dashboard-nav-link ${activeTab === "resumen" ? "dashboard-nav-link-active" : ""}`}
            onClick={() => setActiveTab("resumen")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Resumen
          </button>
          <button
            type="button"
            className={`dashboard-nav-link ${activeTab === "gastos" ? "dashboard-nav-link-active" : ""}`}
            onClick={() => setActiveTab("gastos")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Gastos ({expenses.length})
          </button>
          <button
            type="button"
            className={`dashboard-nav-link ${activeTab === "integrantes" ? "dashboard-nav-link-active" : ""}`}
            onClick={() => setActiveTab("integrantes")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Integrantes ({members.length})
          </button>
          <button
            type="button"
            className={`dashboard-nav-link ${activeTab === "tareas" ? "dashboard-nav-link-active" : ""}`}
            onClick={() => setActiveTab("tareas")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Tareas ({tasks.length})
          </button>
          <Link className="dashboard-nav-link" to="/profile">
            Mi Perfil
          </Link>
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
            <span className="dashboard-menu" aria-hidden="true">
              •••
            </span>
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
                <UserIcon size={14} /> Mi Perfil y Cuenta
              </Link>
              <button
                type="button"
                className="dashboard-dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  setNuevoIngresoInput(String(userProfile?.ingresoMensual || ""));
                  setModalIngresoOpen(true);
                }}
                role="menuitem"
              >
                <DollarSign size={14} /> Modificar Ingreso Mensual
              </button>
              <Link
                to="/crear-vivienda"
                className="dashboard-dropdown-item"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
                id="link-create-dwelling"
              >
                <Home size={14} /> Crear nueva vivienda
              </Link>
              <Link
                to="/unirse-vivienda"
                className="dashboard-dropdown-item"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
                id="link-join-dwelling"
              >
                <Key size={14} /> Unirme con código
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

      {/* Main Container */}
      <section className="dashboard-content" style={{ maxWidth: "1060px", margin: "0 auto", padding: "36px 20px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "16px", color: "var(--dashboard-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Loader2 size={18} className="animate-spin" />
            <span style={{ fontSize: "13px" }}>Sincronizando información del hogar...</span>
          </div>
        )}

        {/* Global Feedback Banners */}
        {actionError && (
          <div
            style={{
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              padding: "14px 18px",
              borderRadius: "10px",
              marginBottom: "24px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c" }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div
            style={{
              color: "#15803d",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: "14px 18px",
              borderRadius: "10px",
              marginBottom: "24px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#15803d" }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Dwelling Status / Welcome Bar */}
        {dwelling ? (
          <div
            style={{
              background: "#ffffff",
              padding: "24px 28px",
              borderRadius: "16px",
              border: "1px solid #dce8e2",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              marginBottom: "32px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
            }}
          >
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--dashboard-green)" }}>
                Hogar Activo
              </p>
              <h1 style={{ margin: "0 0 6px", fontSize: "28px", color: "var(--dashboard-ink)" }}>
                {dwelling.nombre}
              </h1>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--dashboard-muted)" }}>
                {dwelling.direccion || "Dirección no especificada"} · {members.length} {members.length === 1 ? "integrante" : "integrantes"}
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
              {/* Código de invitación con 1-click copy */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f4f8f6",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #c8dcd2",
                }}
              >
                <span style={{ fontSize: "12px", color: "#4f665c", fontWeight: 600 }}>Código:</span>
                <strong style={{ fontFamily: "monospace", fontSize: "16px", letterSpacing: "2px", color: "var(--dashboard-green)" }}>
                  {dwelling.codigoInvitacion}
                </strong>
                <button
                  type="button"
                  onClick={() => handleCopyCode(dwelling.codigoInvitacion)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--dashboard-green)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Copiar código de invitación"
                >
                  {copiedCode ? <Check size={16} color="#15803d" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Botón Registrar Gasto (HU10) */}
              <button
                type="button"
                className="dashboard-primary-action"
                onClick={handleOpenGastoModal}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} /> Registrar gasto
              </button>
            </div>
          </div>
        ) : (
          /* Empty State: Usuario sin vivienda vinculada */
          <div
            style={{
              background: "#ffffff",
              padding: "40px 32px",
              borderRadius: "16px",
              border: "1px solid #dce8e2",
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            <Home size={44} color="var(--dashboard-green)" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: "24px", color: "var(--dashboard-ink)", margin: "0 0 10px" }}>
              ¡Hola, {firstName}! Aún no perteneces a una vivienda
            </h2>
            <p style={{ color: "var(--dashboard-muted)", fontSize: "15px", maxWidth: "560px", margin: "0 auto 24px" }}>
              Para gestionar gastos compartidos, calcular cuotas proporcionales y coordinar tareas del hogar, crea un nuevo espacio o únete con un código.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
              <Link
                to="/crear-vivienda"
                style={{
                  background: "var(--dashboard-green)",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
              >
                Crear nueva vivienda
              </Link>
              <Link
                to="/unirse-vivienda"
                style={{
                  background: "#ffffff",
                  color: "var(--dashboard-green)",
                  border: "1px solid var(--dashboard-green)",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
              >
                Unirme con código
              </Link>
              <button
                type="button"
                onClick={handleSeedDemoData}
                style={{
                  background: "#f4f8f6",
                  color: "#2a5446",
                  border: "1px dashed var(--dashboard-green)",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "15px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={16} /> Cargar datos de demostración
              </button>
            </div>
          </div>
        )}

        {/* Summary Stats Cards */}
        <div className="dashboard-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {/* Card: Tu Saldo */}
          <article className="dashboard-stat dashboard-stat-featured">
            <div className="dashboard-stat-topline">
              <span>Tu Saldo Individual</span>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: userSaldo > 0 ? "#15803d" : userSaldo < 0 ? "#b91c1c" : "#94a3b8",
                }}
              />
            </div>
            <strong style={{ color: userSaldo > 0 ? "#15803d" : userSaldo < 0 ? "#b91c1c" : "inherit" }}>
              {userSaldo > 0 ? `+${formatCOP(userSaldo)}` : userSaldo < 0 ? `-${formatCOP(Math.abs(userSaldo))}` : "$0"}
            </strong>
            <p>
              {userSaldo > 0 ? "A tu favor (te deben)" : userSaldo < 0 ? "En contra (debes pagar)" : "Al día con la vivienda"}
            </p>
          </article>

          {/* Card: Gastos Totales */}
          <article className="dashboard-stat">
            <div className="dashboard-stat-topline">
              <span>Total Gastos del Hogar</span>
              <span className="dashboard-stat-icon">$</span>
            </div>
            <strong>{formatCOP(totalGastosMes)}</strong>
            <p>{expenses.length} movimientos registrados</p>
          </article>

          {/* Card: Tu Ingreso Mensual Registrado (HU04) */}
          <article className="dashboard-stat">
            <div className="dashboard-stat-topline">
              <span>Tu Ingreso Mensual</span>
              <button
                type="button"
                onClick={() => {
                  setNuevoIngresoInput(String(userProfile?.ingresoMensual || ""));
                  setModalIngresoOpen(true);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dashboard-green)", fontSize: "11px", fontWeight: 700 }}
              >
                Modificar
              </button>
            </div>
            <strong>{formatCOP(userProfile?.ingresoMensual || 0)}</strong>
            <p>Usado en el reparto proporcional</p>
          </article>

          {/* Card: Tareas Pendientes */}
          <article className="dashboard-stat">
            <div className="dashboard-stat-topline">
              <span>Tareas Pendientes</span>
              <span className="dashboard-stat-icon">✓</span>
            </div>
            <strong>{tasks.filter((t) => !t.completada).length}</strong>
            <p>{tasks.filter((t) => t.completada).length} completadas</p>
          </article>
        </div>

        {/* Tab Controls */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--dashboard-line)", margin: "32px 0 24px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("resumen")}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "resumen" ? "2px solid var(--dashboard-green)" : "2px solid transparent",
              color: activeTab === "resumen" ? "var(--dashboard-green)" : "var(--dashboard-muted)",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Vista General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gastos")}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "gastos" ? "2px solid var(--dashboard-green)" : "2px solid transparent",
              color: activeTab === "gastos" ? "var(--dashboard-green)" : "var(--dashboard-muted)",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Historial de Gastos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("integrantes")}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "integrantes" ? "2px solid var(--dashboard-green)" : "2px solid transparent",
              color: activeTab === "integrantes" ? "var(--dashboard-green)" : "var(--dashboard-muted)",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Integrantes y Saldos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tareas")}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "tareas" ? "2px solid var(--dashboard-green)" : "2px solid transparent",
              color: activeTab === "tareas" ? "var(--dashboard-green)" : "var(--dashboard-muted)",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Tareas Domésticas
          </button>
        </div>

        {/* TAB 1: RESUMEN / VISTA GENERAL */}
        {activeTab === "resumen" && (
          <div className="dashboard-grid">
            {/* Gastos Recientes */}
            <section className="dashboard-section dashboard-expenses" id="gastos">
              <div className="dashboard-section-heading">
                <div>
                  <p className="dashboard-eyebrow">Actividad Económica</p>
                  <h2>Gastos recientes</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("gastos")}
                  style={{ background: "none", border: "none", color: "var(--dashboard-green)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                >
                  Ver todos ({expenses.length})
                </button>
              </div>

              {expenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--dashboard-muted)" }}>
                  <p>No se han registrado gastos aún en esta vivienda.</p>
                  <button
                    type="button"
                    onClick={handleOpenGastoModal}
                    style={{
                      background: "var(--dashboard-green)",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    + Registrar primer gasto
                  </button>
                </div>
              ) : (
                <div className="dashboard-list">
                  {expenses.slice(0, 4).map((gasto) => (
                    <article
                      className="dashboard-list-row"
                      key={gasto.id}
                      onClick={() => setSelectedExpenseForDetail(gasto)}
                      style={{ cursor: "pointer" }}
                      title="Ver desglose proporcional"
                    >
                      <span className="dashboard-expense-icon dashboard-expense-icon-green">$</span>
                      <div className="dashboard-list-copy">
                        <strong>{gasto.concepto}</strong>
                        <span>
                          Pagó: {gasto.pagadorNombre || "Integrante"} · {gasto.fecha}
                        </span>
                      </div>
                      <div style={{ textAlign: "right", marginLeft: "auto" }}>
                        <strong className="dashboard-list-amount">{formatCOP(gasto.monto)}</strong>
                        {user && gasto.cuotas[user.uid] !== undefined && (
                          <div style={{ fontSize: "11px", color: "var(--dashboard-muted)" }}>
                            Tu cuota: {formatCOP(gasto.cuotas[user.uid])}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Tareas Domésticas */}
            <section className="dashboard-section dashboard-tasks" id="tareas">
              <div className="dashboard-section-heading">
                <div>
                  <p className="dashboard-eyebrow">Organización de la casa</p>
                  <h2>Próximas tareas</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setModalTareaOpen(true);
                  }}
                  style={{ background: "none", border: "none", color: "var(--dashboard-green)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                >
                  + Nueva tarea
                </button>
              </div>

              {tasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--dashboard-muted)" }}>
                  <p>No hay tareas pendientes en el hogar.</p>
                </div>
              ) : (
                <div className="dashboard-list">
                  {tasks.slice(0, 4).map((t) => (
                    <article className="dashboard-list-row dashboard-task-row" key={t.id}>
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t.id, t.completada)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        title={t.completada ? "Marcar pendiente" : "Marcar completada"}
                      >
                        {t.completada ? (
                          <CheckSquare size={18} color="#15803d" />
                        ) : (
                          <Square size={18} color="#94a3b8" />
                        )}
                      </button>
                      <div className="dashboard-list-copy" style={{ textDecoration: t.completada ? "line-through" : "none", opacity: t.completada ? 0.6 : 1 }}>
                        <strong>{t.titulo}</strong>
                        <span>
                          {t.responsableNombre || "Integrante"} · Vence: {t.fechaVencimiento}
                        </span>
                      </div>
                      <span
                        className={`dashboard-task-state ${
                          t.completada ? "dashboard-task-state-scheduled" : "dashboard-task-state-pending"
                        }`}
                      >
                        {t.completada ? "Completada" : "Pendiente"}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: HISTORIAL FILTRADO DE GASTOS (HU12) */}
        {activeTab === "gastos" && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "22px", margin: "0 0 4px", color: "var(--dashboard-ink)" }}>
                  Historial de Gastos de la Vivienda
                </h2>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--dashboard-muted)" }}>
                  Consulta cronológica de todos los gastos con filtrado avanzado y desglose proporcional exacto.
                </p>
              </div>
              <button
                type="button"
                className="dashboard-primary-action"
                onClick={handleOpenGastoModal}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} /> Registrar nuevo gasto
              </button>
            </div>

            {/* Filtros Avanzados (HU12) */}
            <div className="dashboard-filter-bar">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
                <Filter size={16} color="var(--dashboard-muted)" />
                <input
                  type="text"
                  placeholder="Buscar por concepto o categoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="dashboard-filter-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--dashboard-muted)" }}>Desde:</span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="dashboard-filter-input"
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--dashboard-muted)" }}>Hasta:</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="dashboard-filter-input"
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--dashboard-muted)" }}>Pagador:</span>
                <select
                  value={filtroPagador}
                  onChange={(e) => setFiltroPagador(e.target.value)}
                  className="dashboard-filter-select"
                >
                  <option value="todos">Todos los pagadores</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {(busqueda || fechaInicio || fechaFin || filtroPagador !== "todos") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: "none",
                    border: "1px solid #d0dfd8",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "var(--dashboard-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Restablecer todos los filtros"
                >
                  <RotateCcw size={14} /> Limpiar filtros
                </button>
              )}
            </div>

            {/* Listado de Gastos */}
            {gastosFiltrados.length === 0 ? (
              <div
                style={{
                  background: "#ffffff",
                  padding: "48px 24px",
                  textAlign: "center",
                  borderRadius: "12px",
                  border: "1px solid #dce8e2",
                  color: "var(--dashboard-muted)",
                }}
              >
                <p style={{ margin: "0 0 12px", fontSize: "16px" }}>
                  No se encontraron gastos que coincidan con los criterios de filtro aplicados.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: "var(--dashboard-green)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="dashboard-table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Categoría</th>
                      <th>Pagado por</th>
                      <th>Monto Total</th>
                      <th>Tu Cuota</th>
                      <th style={{ textAlign: "center" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosFiltrados.map((g) => {
                      const userCuota = user ? g.cuotas[user.uid] : undefined;
                      return (
                        <tr key={g.id}>
                          <td>{g.fecha}</td>
                          <td>
                            <strong>{g.concepto}</strong>
                          </td>
                          <td>
                            <span className="dashboard-badge dashboard-badge-member">
                              {g.categoria || "Hogar"}
                            </span>
                          </td>
                          <td>{g.pagadorNombre || "Integrante"}</td>
                          <td>
                            <strong>{formatCOP(g.monto)}</strong>
                          </td>
                          <td>
                            {userCuota !== undefined ? (
                              <span style={{ fontWeight: 600, color: "var(--dashboard-green)" }}>
                                {formatCOP(userCuota)}
                              </span>
                            ) : (
                              <span style={{ color: "var(--dashboard-muted)" }}>No participas</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => setSelectedExpenseForDetail(g)}
                              style={{
                                background: "#f0f6f3",
                                border: "1px solid #c8dcd2",
                                color: "var(--dashboard-green)",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Eye size={13} /> Desglose
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: INTEGRANTES Y SALDOS (HU07, HU08, HU09) */}
        {activeTab === "integrantes" && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "22px", margin: "0 0 4px", color: "var(--dashboard-ink)" }}>
                  Integrantes de la Vivienda
                </h2>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--dashboard-muted)" }}>
                  Gestión de miembros, ingresos mensuales individuales y saldos consolidados de la vivienda.
                </p>
              </div>

              {dwelling && (
                <button
                  type="button"
                  onClick={handleAbandonarViviendaPropia}
                  style={{
                    background: "#fff5f5",
                    color: "#c53030",
                    border: "1px solid #feb2b2",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  title="Abandonar vivienda si saldo es $0 y no tienes tareas pendientes"
                >
                  <DoorOpen size={16} /> Abandonar vivienda
                </button>
              )}
            </div>

            {/* Tabla de Integrantes (HU07) */}
            <div className="dashboard-table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Integrante</th>
                    <th>Rol</th>
                    <th>Ingreso Mensual</th>
                    <th>Aporte Estimado (%)</th>
                    <th>Saldo Consolidado</th>
                    <th style={{ textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const esAdmin = dwelling?.administradorId === m.id;
                    const esCurrentUser = user?.uid === m.id;
                    const saldo = saldosConsolidados[m.id] || 0;

                    const totalIngresosTodos = members.reduce(
                      (acc, u) => acc + (u.ingresoMensual > 0 ? u.ingresoMensual : 0),
                      0
                    );
                    const porcentaje =
                      totalIngresosTodos > 0
                        ? Math.round((m.ingresoMensual / totalIngresosTodos) * 100)
                        : Math.round(100 / members.length);

                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                background: esCurrentUser ? "var(--dashboard-green)" : "#e2ece6",
                                color: esCurrentUser ? "#ffffff" : "var(--dashboard-green)",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 700,
                                fontSize: "12px",
                              }}
                            >
                              {m.nombre.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ display: "block" }}>
                                {m.nombre} {esCurrentUser && <span style={{ color: "var(--dashboard-green)" }}>(Tú)</span>}
                              </strong>
                              <span style={{ fontSize: "12px", color: "var(--dashboard-muted)" }}>
                                {m.email || "Sin correo"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {esAdmin ? (
                            <span className="dashboard-badge dashboard-badge-admin">Administrador</span>
                          ) : (
                            <span className="dashboard-badge dashboard-badge-member">Integrante</span>
                          )}
                        </td>
                        <td>
                          <strong>{formatCOP(m.ingresoMensual || 0)}</strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{porcentaje}%</span>
                        </td>
                        <td>
                          {saldo > 0 ? (
                            <span className="dashboard-badge dashboard-badge-positive">
                              +{formatCOP(saldo)} (A favor)
                            </span>
                          ) : saldo < 0 ? (
                            <span className="dashboard-badge dashboard-badge-negative">
                              -{formatCOP(Math.abs(saldo))} (Deuda)
                            </span>
                          ) : (
                            <span className="dashboard-badge dashboard-badge-zero">$0 (Al día)</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {/* HU08: Retirar integrante por administrador */}
                          {dwelling?.administradorId === user?.uid && !esCurrentUser && (
                            <button
                              type="button"
                              onClick={() => handleRetirarIntegrante(m)}
                              style={{
                                background: "#fff5f5",
                                color: "#c53030",
                                border: "1px solid #feb2b2",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              title="Retirar a este integrante de la vivienda (requiere saldo $0)"
                            >
                              <Trash2 size={13} /> Retirar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: TAREAS DOMÉSTICAS */}
        {activeTab === "tareas" && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "22px", margin: "0 0 4px", color: "var(--dashboard-ink)" }}>
                  Organización de Tareas del Hogar
                </h2>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--dashboard-muted)" }}>
                  Coordinación de responsabilidades domésticas asignadas a cada integrante.
                </p>
              </div>
              <button
                type="button"
                className="dashboard-primary-action"
                onClick={() => {
                  setActionError(null);
                  setModalTareaOpen(true);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} /> Crear nueva tarea
              </button>
            </div>

            {tasks.length === 0 ? (
              <div
                style={{
                  background: "#ffffff",
                  padding: "48px 24px",
                  textAlign: "center",
                  borderRadius: "12px",
                  border: "1px solid #dce8e2",
                  color: "var(--dashboard-muted)",
                }}
              >
                <p style={{ margin: "0 0 12px", fontSize: "16px" }}>No hay tareas registradas en esta vivienda.</p>
                <button
                  type="button"
                  onClick={() => setModalTareaOpen(true)}
                  style={{
                    background: "var(--dashboard-green)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  + Asignar primera tarea
                </button>
              </div>
            ) : (
              <div className="dashboard-table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>Estado</th>
                      <th>Tarea</th>
                      <th>Descripción</th>
                      <th>Responsable</th>
                      <th>Fecha Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleTask(t.id, t.completada)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            title={t.completada ? "Marcar pendiente" : "Marcar completada"}
                          >
                            {t.completada ? (
                              <CheckSquare size={20} color="#15803d" />
                            ) : (
                              <Square size={20} color="#94a3b8" />
                            )}
                          </button>
                        </td>
                        <td>
                          <strong style={{ textDecoration: t.completada ? "line-through" : "none", opacity: t.completada ? 0.6 : 1 }}>
                            {t.titulo}
                          </strong>
                        </td>
                        <td style={{ color: "var(--dashboard-muted)" }}>{t.descripcion || "Sin descripción"}</td>
                        <td>
                          <span className="dashboard-badge dashboard-badge-member">
                            {t.responsableNombre || "Integrante"}
                          </span>
                        </td>
                        <td>{t.fechaVencimiento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR GASTO COMPARTIDO (HU10 & HU11)                         */}
      {/* ========================================================================= */}
      {modalGastoOpen && (
        <div className="dashboard-modal-backdrop" onClick={() => setModalGastoOpen(false)}>
          <div className="dashboard-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <h3 className="dashboard-modal-title">
                <DollarSign size={20} color="var(--dashboard-green)" />
                Registrar Gasto Compartido
              </h3>
              <button
                type="button"
                className="dashboard-modal-close"
                onClick={() => setModalGastoOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarGasto} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "var(--dashboard-ink)" }}>
                  Concepto o descripción *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mercado quincenal Éxito, Recibo de luz"
                  value={gastoConcepto}
                  onChange={(e) => setGastoConcepto(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "var(--dashboard-ink)" }}>
                    Monto total (COP) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    placeholder="Ej: 150000"
                    value={gastoMonto}
                    onChange={(e) => setGastoMonto(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "var(--dashboard-ink)" }}>
                    Fecha del gasto
                  </label>
                  <input
                    type="date"
                    value={gastoFecha}
                    onChange={(e) => setGastoFecha(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "var(--dashboard-ink)" }}>
                    ¿Quién pagó el gasto? *
                  </label>
                  <select
                    value={gastoPagadorId}
                    onChange={(e) => setGastoPagadorId(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} {m.id === user?.uid ? "(Tú)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "var(--dashboard-ink)" }}>
                    Categoría
                  </label>
                  <select
                    value={gastoCategoria}
                    onChange={(e) => setGastoCategoria(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                  >
                    <option value="Mercado">Mercado y Alimentos</option>
                    <option value="Servicios">Servicios Públicos (Luz, Agua, Gas, Net)</option>
                    <option value="Aseo">Artículos de Limpieza y Hogar</option>
                    <option value="Arriendo">Arriendo o Administración</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>

              {/* Selector de Participantes */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--dashboard-ink)" }}>
                  Participantes del gasto ({gastoParticipantes.length} seleccionados) *
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {members.map((m) => {
                    const checked = gastoParticipantes.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => handleToggleParticipante(m.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          border: checked ? "1px solid var(--dashboard-green)" : "1px solid #dce8e2",
                          background: checked ? "#e5efe5" : "#ffffff",
                          color: checked ? "var(--dashboard-green)" : "var(--dashboard-muted)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {checked ? <Check size={13} /> : null}
                        {m.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* HU11: Interactive Live Proportional Breakdown Table */}
              {calculoEnVivo && calculoEnVivo.desgloseCuotas.length > 0 && (
                <div
                  style={{
                    background: "#f8faf9",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid #d0e2d8",
                    marginTop: "4px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "13px", color: "var(--dashboard-green)" }}>
                      Vista previa de distribución proporcional (HU11):
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--dashboard-muted)" }}>
                      Fórmula: Ci = Monto · (Ii / TotalIngresos)
                    </span>
                  </div>

                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #dce8e2", color: "var(--dashboard-muted)" }}>
                        <th style={{ textAlign: "left", paddingBottom: "4px" }}>Participante</th>
                        <th style={{ textAlign: "right", paddingBottom: "4px" }}>Ingreso</th>
                        <th style={{ textAlign: "right", paddingBottom: "4px" }}>% Proporcional</th>
                        <th style={{ textAlign: "right", paddingBottom: "4px" }}>Cuota Calculada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculoEnVivo.desgloseCuotas.map((share) => (
                        <tr key={share.userId} style={{ borderBottom: "1px solid #eef4f1" }}>
                          <td style={{ padding: "6px 0", fontWeight: 600 }}>{share.nombre}</td>
                          <td style={{ textAlign: "right", padding: "6px 0" }}>{formatCOP(share.ingreso)}</td>
                          <td style={{ textAlign: "right", padding: "6px 0" }}>
                            {Math.round(share.proporcion * 100)}%
                          </td>
                          <td style={{ textAlign: "right", padding: "6px 0", fontWeight: 700, color: "var(--dashboard-green)" }}>
                            {formatCOP(share.cuota)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {calculoEnVivo.residuoAjustado !== 0 && (
                    <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#6b7280", fontStyle: "italic" }}>
                      * Se aplicó un ajuste por redondeo monetario de {formatCOP(calculoEnVivo.residuoAjustado)} acreditado al pagador para garantizar coincidencia exacta al 100% del monto.
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={guardandoGasto}
                style={{
                  background: "var(--dashboard-green)",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {guardandoGasto ? <Loader2 size={16} className="animate-spin" /> : "Guardar gasto con cálculo exacto"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETALLE Y DESGLOSE PROPORCIONAL DE GASTO (HU12)                  */}
      {/* ========================================================================= */}
      {selectedExpenseForDetail && (
        <div className="dashboard-modal-backdrop" onClick={() => setSelectedExpenseForDetail(null)}>
          <div className="dashboard-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <h3 className="dashboard-modal-title">
                <Info size={20} color="var(--dashboard-green)" />
                Desglose Proporcional del Gasto
              </h3>
              <button
                type="button"
                className="dashboard-modal-close"
                onClick={() => setSelectedExpenseForDetail(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: "20px", color: "var(--dashboard-ink)" }}>
                {selectedExpenseForDetail.concepto}
              </h4>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--dashboard-muted)" }}>
                Pagado por: <strong>{selectedExpenseForDetail.pagadorNombre || "Integrante"}</strong> · Fecha: {selectedExpenseForDetail.fecha} · Categoría: {selectedExpenseForDetail.categoria || "Hogar"}
              </p>
              <div style={{ margin: "14px 0", fontSize: "24px", fontWeight: 800, color: "var(--dashboard-green)" }}>
                Total: {formatCOP(selectedExpenseForDetail.monto)}
              </div>
            </div>

            <div style={{ background: "#f8faf9", padding: "16px", borderRadius: "10px", border: "1px solid #dce8e2" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: "var(--dashboard-ink)" }}>
                Distribución Individual Proporcional (HU11)
              </div>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #dce8e2", color: "var(--dashboard-muted)" }}>
                    <th style={{ textAlign: "left", paddingBottom: "6px" }}>Participante</th>
                    <th style={{ textAlign: "right", paddingBottom: "6px" }}>Cuota Asignada</th>
                    <th style={{ textAlign: "right", paddingBottom: "6px" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedExpenseForDetail.cuotas).map(([uid, cuota]) => {
                    const memberObj = members.find((m) => m.id === uid);
                    const esPagador = uid === selectedExpenseForDetail.pagadorId;
                    return (
                      <tr key={uid} style={{ borderBottom: "1px solid #eef4f1" }}>
                        <td style={{ padding: "8px 0", fontWeight: 600 }}>
                          {memberObj?.nombre || "Integrante"} {esPagador ? "(Pagó el total)" : ""}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 0", fontWeight: 700 }}>
                          {formatCOP(cuota)}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 0" }}>
                          {esPagador ? (
                            <span className="dashboard-badge dashboard-badge-positive">Acreedor</span>
                          ) : (
                            <span className="dashboard-badge dashboard-badge-member">Participante</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #dce8e2", fontSize: "12px", color: "var(--dashboard-muted)" }}>
                Verificación: La suma de cuotas equivale al 100% del valor total registrado ({formatCOP(selectedExpenseForDetail.monto)}).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MODIFICAR INGRESO MENSUAL INDIVIDUAL (HU04)                       */}
      {/* ========================================================================= */}
      {modalIngresoOpen && (
        <div className="dashboard-modal-backdrop" onClick={() => setModalIngresoOpen(false)}>
          <div className="dashboard-modal-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <h3 className="dashboard-modal-title">
                <DollarSign size={20} color="var(--dashboard-green)" />
                Actualizar Ingreso Mensual
              </h3>
              <button
                type="button"
                className="dashboard-modal-close"
                onClick={() => setModalIngresoOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--dashboard-muted)", margin: "0 0 16px" }}>
              Modifica tu ingreso individual mensual. Los cálculos proporcionales de gastos posteriores emplearán automáticamente este valor.
            </p>

            <form onSubmit={handleGuardarIngreso} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                  Monto mensual en COP (mayor a cero) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={nuevoIngresoInput}
                  onChange={(e) => setNuevoIngresoInput(e.target.value)}
                  placeholder="Ej: 3200000"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box", fontSize: "16px", fontWeight: 600 }}
                />
              </div>

              <button
                type="submit"
                disabled={guardandoIngreso}
                style={{
                  background: "var(--dashboard-green)",
                  color: "#ffffff",
                  border: "none",
                  padding: "11px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {guardandoIngreso ? "Guardando..." : "Guardar nuevo ingreso"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREAR NUEVA TAREA DOMÉSTICA                                      */}
      {/* ========================================================================= */}
      {modalTareaOpen && (
        <div className="dashboard-modal-backdrop" onClick={() => setModalTareaOpen(false)}>
          <div className="dashboard-modal-card" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <h3 className="dashboard-modal-title">
                <CheckSquare size={20} color="var(--dashboard-green)" />
                Asignar Tarea del Hogar
              </h3>
              <button
                type="button"
                className="dashboard-modal-close"
                onClick={() => setModalTareaOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarTarea} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                  Título de la tarea *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Limpiar estufa y horno, Lavar baños"
                  value={tareaTitulo}
                  onChange={(e) => setTareaTitulo(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                  Descripción (opcional)
                </label>
                <textarea
                  placeholder="Instrucciones adicionales para la tarea..."
                  value={tareaDescripcion}
                  onChange={(e) => setTareaDescripcion(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                    Integrante Responsable *
                  </label>
                  <select
                    value={tareaResponsableId}
                    onChange={(e) => setTareaResponsableId(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                    Fecha de vencimiento *
                  </label>
                  <input
                    type="date"
                    value={tareaFecha}
                    onChange={(e) => setTareaFecha(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dce8e2", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={guardandoTarea}
                style={{
                  background: "var(--dashboard-green)",
                  color: "#ffffff",
                  border: "none",
                  padding: "11px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: "8px",
                }}
              >
                {guardandoTarea ? "Asignando..." : "Asignar tarea"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Dashboard;
