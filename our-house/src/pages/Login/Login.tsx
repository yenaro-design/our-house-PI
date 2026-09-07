import { Link, useLocation } from "react-router-dom";
import "./Login.css";

function Login() {
  const location = useLocation();
  const registrationMessage =
    typeof location.state === "object" &&
    location.state !== null &&
    "message" in location.state &&
    typeof location.state.message === "string"
      ? location.state.message
      : "";

  return (
    <main className="login-page">
      <section className="login-story" aria-labelledby="login-story-title">
        <Link className="login-brand" to="/" aria-label="Ir a la página principal de Our House">
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

          <form className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <input id="login-email" type="email" placeholder="tu-correo@ejemplo.com" autoComplete="email" />
            </div>

            <div className="login-field">
              <div className="login-label-row">
                <label htmlFor="login-password">Contraseña</label>
                <button className="login-help" type="button">¿La olvidaste?</button>
              </div>
              <input id="login-password" type="password" placeholder="Ingresa tu contraseña" autoComplete="current-password" />
            </div>

            <button className="login-submit" type="button">
              <span>Entrar a mi casa</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="login-signup">
            ¿Todavía no tienes cuenta? <Link to="/register">Crear cuenta</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
