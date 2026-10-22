import { useEffect } from 'react';
import { MESES, periodoActual } from '../lib/format';

// ====================================================
// ÍCONOS (trazo de 1.75, estilo lineal)
// ====================================================

const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  receipt: <><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  wallet: <><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3h-4a2 2 0 0 0 0 4h4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M6 15h4" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  logout: <><path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" /><path d="m10 17-5-5 5-5M5 12h11" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  split: <><path d="M16 3h5v5M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3M21 3l-7.83 7.83" /></>,
  arrowUp: <path d="M7 17 17 7M8 7h9v9" />,
  arrowDown: <path d="M17 7 7 17M16 17H7V8" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
  piggy: <><path d="M19 9c1.1 0 2 .9 2 2v2a2 2 0 0 1-2 2h-.5l-1.5 3h-3l-.5-1.5h-3L10 19H7l-1-3.5A6 6 0 0 1 9 5h4.5a6 6 0 0 1 5 2.5" /><circle cx="15.5" cy="10.5" r=".75" fill="currentColor" /></>,
};

export function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ====================================================
// ESTRUCTURA
// ====================================================

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between animate-fade-up">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-3 text-sm text-muted max-w-md">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

// Selector "‹ Octubre 2026 ›": más cómodo en celular que dos <select>
export function PeriodPicker({ periodo, onChange }) {
  const mover = (delta) => {
    const fecha = new Date(periodo.anio, periodo.mes - 1 + delta, 1);
    onChange({ anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 });
  };
  const actual = periodoActual();
  const esActual = periodo.anio === actual.anio && periodo.mes === actual.mes;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      <button type="button" onClick={() => mover(-1)} className="btn-ghost h-9 w-9 px-0 rounded-lg" aria-label="Mes anterior">
        <Icon name="chevronLeft" size={18} />
      </button>
      <span className="min-w-[8.5rem] text-center text-sm font-medium text-ink num">
        {MESES[periodo.mes - 1]} {periodo.anio}
      </span>
      <button type="button" onClick={() => mover(1)} disabled={esActual} className="btn-ghost h-9 w-9 px-0 rounded-lg" aria-label="Mes siguiente">
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`no-scrollbar overflow-x-auto ${className}`}>
      <div className="inline-flex min-w-full gap-1 rounded-xl border border-line bg-surface p-1 md:min-w-0">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium md:px-3.5 transition-all duration-200 ${
              value === opt.value ? 'bg-elevated text-ink shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]' : 'text-faint hover:text-muted'
            }`}
          >
            {opt.label}
            {opt.count != null && <span className="ml-1.5 text-faint num">{opt.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ====================================================
// MODAL: hoja inferior en celular, ventana centrada en PC
// ====================================================

export function Modal({ open, onClose, title, subtitle, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${size === 'sm' ? 'md:max-w-sm' : 'md:max-w-md'} max-h-[92vh] overflow-y-auto
          rounded-t-3xl md:rounded-3xl border border-line-strong bg-surface
          px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-7
          animate-sheet-up md:animate-pop-in`}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15 md:hidden" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-3xl leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-muted break-words">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2 -mt-1 h-9 w-9 px-0 rounded-full" aria-label="Cerrar">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

// Campo de monto grande con prefijo de moneda
export function AmountInput({ value, onChange, moneda = 'PEN', autoFocus, step = '0.01', ...rest }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-faint">{moneda === 'USD' ? '$' : 'S/'}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min="0"
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        placeholder="0.00"
        className="input h-16 pl-14 text-3xl font-medium num md:text-3xl"
        required
        {...rest}
      />
    </div>
  );
}

// ====================================================
// DATOS
// ====================================================

export function StatCard({ label, value, icon, tone = 'neutral', hint, className = '', style }) {
  const tones = {
    neutral: 'text-muted bg-white/[0.05]',
    positive: 'text-positive bg-positive/10',
    negative: 'text-negative bg-negative/10',
    accent: 'text-accent bg-accent/10',
  };
  return (
    <div className={`card p-5 animate-fade-up ${className}`} style={style}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}>
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <p className="mt-4 whitespace-nowrap text-xl font-medium tracking-tight text-ink num sm:text-2xl md:text-[1.75rem]">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, tone = 'accent', className = '' }) {
  const color = tone === 'positive' ? 'bg-positive' : 'bg-accent';
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <div className={`h-full rounded-full ${color} transition-[width] duration-1000 ease-out`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-up">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-elevated text-faint">
        <Icon name={icon} size={22} />
      </span>
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Avatar({ text }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-elevated text-sm font-medium text-muted">
      {(text || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 md:px-5">
          <div className="skeleton h-10 w-10" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-3 w-1/5" />
          </div>
          <div className="skeleton h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function Pagination({ table }) {
  if (table.getPageCount() <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 md:px-5">
      <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="btn-ghost h-9 px-3">
        <Icon name="chevronLeft" size={16} /> Anterior
      </button>
      <span className="text-xs text-faint num">
        {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
      </span>
      <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="btn-ghost h-9 px-3">
        Siguiente <Icon name="chevronRight" size={16} />
      </button>
    </div>
  );
}

export function Spinner({ className = '' }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />;
}
