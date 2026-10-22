import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAuth } from '../services/api';
import { Icon, Spinner } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiAuth.post('/login', {
        Email: email,
        Password: password
      });

      if (response.data.Success) {
        localStorage.setItem('token', response.data.Token);
        localStorage.setItem('userId', response.data.UserId);
        navigate('/dashboard');
      } else {
        setError(response.data.Message || 'Credenciales incorrectas');
      }
    } catch (err) {
      // El backend responde 401 con un mensaje cuando el usuario o la contraseña no coinciden
      setError(err.response?.data?.Message || 'No pudimos conectar con el servidor. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen bg-canvas text-ink lg:grid-cols-[1.1fr_1fr]">
      {/* --- PANEL DE MARCA (PC) --- */}
      <section className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(closest-side,rgba(212,247,90,0.14),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-canvas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight">
            Hogar<span className="font-display text-xl font-normal italic text-muted">app</span>
          </span>
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-7xl leading-[0.92] tracking-tight">
            Tu dinero,<br />
            <span className="italic text-accent">en calma.</span>
          </h1>
          <p className="mt-6 max-w-sm text-muted">
            Los gastos de tus correos se registran solos. Tú solo decides a dónde va cada sol.
          </p>
        </div>

        <div className="relative flex gap-8 text-sm text-faint">
          <span className="flex items-center gap-2"><Icon name="sparkle" size={16} className="text-accent" /> Lectura automática</span>
          <span className="flex items-center gap-2"><Icon name="card" size={16} className="text-accent" /> Cuotas</span>
          <span className="flex items-center gap-2"><Icon name="target" size={16} className="text-accent" /> Metas de ahorro</span>
        </div>
      </section>

      {/* --- FORMULARIO --- */}
      <section className="relative flex items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(212,247,90,0.08),transparent)] lg:hidden" />

        <div className="relative w-full max-w-sm animate-fade-up">
          <div className="mb-10 lg:hidden">
            <span className="mb-8 grid h-11 w-11 place-items-center rounded-2xl bg-accent text-canvas">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight">
              Tu dinero,<br /><span className="italic text-accent">en calma.</span>
            </h1>
          </div>

          <h2 className="text-xl font-medium tracking-tight">Inicia sesión</h2>
          <p className="mt-1.5 text-sm text-muted">Bienvenido de vuelta a tu hogar financiero.</p>

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-5">
            <label className="block">
              <span className="label">Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="tu@correo.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="label">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-negative/20 bg-negative/[0.08] px-4 py-3 text-sm text-negative animate-fade-in">
                <Icon name="x" size={16} className="mt-0.5" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-2 h-12 w-full text-[15px]">
              {loading ? <><Spinner /> Entrando…</> : <>Entrar <Icon name="chevronRight" size={18} /></>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
