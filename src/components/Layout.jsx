import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from './ui';

const navItems = [
  { name: 'Resumen', path: '/dashboard', icon: 'dashboard' },
  { name: 'Gastos', path: '/gastos', icon: 'receipt' },
  { name: 'Ingresos', path: '/ingresos', icon: 'wallet' },
  { name: 'Cuotas', path: '/cuotas', icon: 'card' },
  { name: 'Metas', path: '/metas', icon: 'target' },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-canvas">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        Hogar<span className="font-display text-lg font-normal italic text-muted">app</span>
      </span>
    </div>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Halo sutil de fondo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(212,247,90,0.06),transparent)]" />

      {/* --- SIDEBAR (PC) --- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-canvas/80 backdrop-blur-xl md:flex">
        <div className="px-6 pb-8 pt-7">
          <Logo />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          <p className="eyebrow px-3 pb-2">Menú</p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/[0.06] text-ink' : 'text-faint hover:bg-white/[0.03] hover:text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />}
                  <Icon name={item.icon} size={18} className={isActive ? 'text-accent' : ''} />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-faint transition-colors hover:bg-negative/10 hover:text-negative">
            <Icon name="logout" size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* --- BARRA SUPERIOR (CELULAR) --- */}
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <button onClick={handleLogout} className="btn-ghost h-10 w-10 px-0 rounded-full" aria-label="Cerrar sesión">
            <Icon name="logout" size={19} />
          </button>
        </div>
      </header>

      {/* --- CONTENIDO --- */}
      <main className="relative px-4 pb-32 pt-6 md:ml-64 md:px-10 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* --- NAVEGACIÓN INFERIOR (CELULAR) --- */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/85 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 px-2 pt-1.5 pb-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-medium transition-colors ${isActive ? 'text-ink' : 'text-faint'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition-all duration-300 ${isActive ? 'bg-accent text-canvas' : ''}`}>
                    <Icon name={item.icon} size={19} />
                  </span>
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
