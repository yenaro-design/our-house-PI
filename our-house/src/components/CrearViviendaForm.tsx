import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, CheckCircle2, AlertCircle, Copy, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { crearVivienda } from '../services/dwellingService';
import '../styles/form-shell.css';

function CrearViviendaForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [error, setError] = useState('');
  const [codigoGenerado, setCodigoGenerado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (nombre.trim() === '') {
      setError('El nombre de la vivienda es obligatorio.');
      return;
    }

    if (direccion.trim() === '') {
      setError('La dirección de la vivienda es obligatoria.');
      return;
    }

    const effectiveUserId = user?.uid || 'usuario-prueba';

    try {
      setGuardando(true);
      const vivienda = await crearVivienda({ nombre: nombre.trim(), direccion: direccion.trim() }, effectiveUserId);
      setCodigoGenerado(vivienda.codigoInvitacion);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al crear la vivienda.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCopy = async () => {
    if (!codigoGenerado) return;
    try {
      await navigator.clipboard.writeText(codigoGenerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <section id="crear-vivienda" className="form-panel">
      <Link to="/dashboard" className="form-back-link">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <div className="form-header">
        <div className="form-header-icon">
          <Home size={20} />
        </div>
        <h2 className="form-title">Crear nueva vivienda</h2>
      </div>
      <p className="form-subtitle">
        Registra tu espacio compartido. Quedarás configurado automáticamente como administrador e integrante.
      </p>

      {!codigoGenerado ? (
        <form onSubmit={handleSubmit} className="form-layout">
          <div className="form-field">
            <label htmlFor="nombre" className="form-label">
              Nombre de la vivienda *
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Apartamento 402 Los Cedros"
              disabled={guardando}
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="direccion" className="form-label">
              Dirección o ubicación *
            </label>
            <input
              id="direccion"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Carrera 45 # 12-30"
              disabled={guardando}
              className="form-input"
            />
          </div>

          <button type="submit" disabled={guardando} className="form-button">
            {guardando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Creando espacio...
              </>
            ) : (
              'Crear vivienda y generar código'
            )}
          </button>
        </form>
      ) : (
        <div className="form-success-box">
          <CheckCircle2 size={42} color="#356b59" style={{ margin: '0 auto 12px' }} />
          <h3>¡Vivienda creada exitosamente!</h3>
          <p>Comparte este código de invitación con tus compañeros para que puedan unirse:</p>

          <div className="form-code-pill">
            <span>{codigoGenerado}</span>
            <button type="button" onClick={handleCopy} className="form-button-secondary">
              {copiado ? <Check size={14} /> : <Copy size={14} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <button type="button" onClick={() => navigate('/dashboard')} className="form-button">
            Ir al Dashboard de la vivienda
          </button>
        </div>
      )}

      {error && (
        <div className="form-alert form-alert--error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

export default CrearViviendaForm;
