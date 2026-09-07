import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../services/authService";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (!nombre.trim() || !email.trim() || !password) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      await registerUser(nombre, email, password);
      navigate("/login", {
        replace: true,
        state: { message: "Usuario registrado correctamente. Ya puedes iniciar sesión." },
      });
    } catch (error: unknown) {
      console.error(error);

      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : undefined;

      switch (errorCode) {
        case "auth/email-already-in-use":
          setError("Ya existe una cuenta con este correo.");
          break;

        case "auth/invalid-email":
          setError("El correo electrónico no es válido.");
          break;

        case "auth/weak-password":
          setError("La contraseña no cumple los requisitos mínimos.");
          break;

        default:
          setError("No fue posible registrar el usuario.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <section className="register-aside" aria-labelledby="register-intro-title">
        <div className="register-brand" aria-label="Our House">
          <span className="register-brand-mark">OH</span>
          <span>our house</span>
        </div>

        <div className="register-intro">
          <p className="register-eyebrow">Tu vivienda, en orden</p>
          <h1 id="register-intro-title">Una casa compartida funciona mejor cuando todos saben qué sigue.</h1>
          <p className="register-intro-copy">
            Centraliza gastos, saldos y tareas domésticas en un solo lugar.
          </p>
        </div>

        <div className="register-note">
          <span className="register-note-dot" aria-hidden="true" />
          <p>Empieza creando tu cuenta. Luego podrás configurar tu vivienda.</p>
        </div>
      </section>

      <section className="register-panel" aria-labelledby="register-title">
        <div className="register-card">
          <div className="register-card-heading">
            <p className="register-eyebrow">Primer paso</p>
            <h2 id="register-title">Crear cuenta</h2>
            <p>Registra tus datos para empezar a organizar la vida en casa.</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="register-field">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Valentina Pérez"
                required
                autoComplete="name"
              />
            </div>

            <div className="register-field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="register-field">
              <div className="register-label-row">
                <label htmlFor="password">Contraseña</label>
                <span>mínimo 6 caracteres</span>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crea una contraseña segura"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <button className="register-submit" type="submit" disabled={loading}>
              <span>{loading ? "Creando cuenta..." : "Crear mi cuenta"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          {error && <p className="register-feedback register-feedback-error" role="alert">{error}</p>}
          {mensaje && <p className="register-feedback register-feedback-success" role="status">{mensaje}</p>}
        </div>

        <p className="register-footer">Tus datos se usarán únicamente para gestionar tu cuenta.</p>
      </section>
    </main>
  );
}

export default Register;