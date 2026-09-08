import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/authService";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationMessage =
    typeof location.state === "object" &&
    location.state !== null &&
    "message" in location.state &&
    typeof location.state.message === "string"
      ? location.state.message
      : "";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    try {
      setLoading(true);
      await loginUser(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code: string }).code
          : undefined;

      switch (code) {
        case "auth/configuration-not-found":
          setError(
            "El servicio de autenticación no está disponible en este proyecto. Puedes probar con la cuenta de demostración."
          );
          break;
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Correo o contraseña incorrectos.");
          break;
        case "auth/invalid-email":
          setError("El correo no es válido.");
          break;
        case "auth/too-many-requests":
          setError("Demasiados intentos fallidos. Espera unos momentos.");
          break;
        case "auth/network-request-failed":
          setError("Error de red. Verifica tu conexión a internet.");
          break;
        default:
          setError("No se pudo iniciar sesión. Revisa tus datos.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail("test@example.com");
    setPassword("password123");
    setError("");
    try {
      setLoading(true);
      await loginUser("test@example.com", "password123");
      navigate("/dashboard");
    } catch {
      setError("No se pudo conectar a la cuenta de prueba. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-labelledby="login-story-title">
        <Link className="login-brand" to="/login" aria-label="Our House, inicio de sesión">
          <span className="login-brand-mark">OH</span>
          <span>our house</span>
        </Link>

        <div className="login-story-copy">
          <p className="login-eyebrow">Bienvenido de vuelta</p>
          <h1 id="login-story-title">Vuelve a poner tu casa en común.</h1>
          <p>Consulta lo que está pendiente, lo que ya se pagó y lo que toca hacer hoy.</p>
        </div>

        <div className="login-story-line" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-heading">
            <p className="login-eyebrow">Acceso a tu vivienda</p>
            <h2 id="login-title">Iniciar sesión</h2>
            <p>Ingresa para revisar el estado de tu casa.</p>
          </div>

          {registrationMessage && (
            <p className="login-feedback" role="status">{registrationMessage}</p>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <div className="login-label-row">
                <label htmlFor="login-password">Contraseña</label>
                <button className="login-help" type="button">¿La olvidaste?</button>
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
                autoComplete="current-password"
              />
            </div>

            <button className="login-submit" type="submit" disabled={loading} id="btn-login-submit">
              <span>{loading ? "Entrando..." : "Entrar a mi casa"}</span>
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              id="btn-login-demo"
              style={{
                marginTop: "10px",
                width: "100%",
                padding: "10px 14px",
                background: "rgba(229, 239, 229, 0.5)",
                border: "1px dashed var(--login-green, #234338)",
                borderRadius: "8px",
                color: "var(--login-green, #234338)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Probar con cuenta de demostración
            </button>
          </form>

          {error && <p className="login-feedback login-feedback-error" role="alert">{error}</p>}

          <div className="login-signup">
            <span>¿Todavía no tienes cuenta?</span>
            <Link className="login-register-action" to="/register">Crear cuenta</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;
