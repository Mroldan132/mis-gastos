import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { apiPlan, mensajeDeError } from '../services/api';
import { Icon, PageHeader, PeriodPicker, Modal, EmptyState, ListSkeleton, Spinner, Avatar } from '../components/ui';
import { formatMonto, formatFecha, periodoActual, periodoTexto, unirCategorias } from '../lib/format';

// Colores categóricos validados (los mismos del Resumen) para identificar a cada miembro
const COLORES_MIEMBRO = ['#3987e5', '#d95926'];

const MODOS = [
  { value: 'mitad', label: 'Mitad y mitad', descripcion: 'Cada uno pone lo mismo.' },
  { value: 'ingresos', label: 'Según ingresos', descripcion: 'Cada uno aporta en proporción a lo que ganó en el mes.' },
  { value: 'fijo', label: 'Porcentaje fijo', descripcion: 'Ustedes eligen cuánto pone cada uno.' },
];

const primerNombre = (nombre = '') => nombre.split(/[ (]/)[0];

export default function Hogar() {
  const [periodo, setPeriodo] = useState(periodoActual);
  const mes = periodoTexto(periodo);
  const [datos, setDatos] = useState(null);

  const [configAbierta, setConfigAbierta] = useState(false);
  const [modo, setModo] = useState('mitad');
  const [porcentajePrimero, setPorcentajePrimero] = useState(50);
  const [compartidas, setCompartidas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      const { data } = await apiPlan.get(`/hogar?mes=${mes}`);
      setDatos(data);
    } catch (e) { console.error(e); setDatos({ Mes: mes, Miembros: [], Movimientos: [], PorCategoria: [], Transferencias: [] }); }
  };

  useEffect(() => { cargar(); }, [mes]);

  // Mientras llegan los datos del mes elegido se muestra la carga (los del mes anterior no sirven)
  const cargando = !datos || datos.Mes !== mes;

  const miembros = datos?.Miembros ?? [];
  const colorDe = (userId) => COLORES_MIEMBRO[miembros.findIndex(m => m.UserId === userId) % COLORES_MIEMBRO.length];

  const categoriasDisponibles = useMemo(() => unirCategorias(datos?.CategoriasDelMes ?? [], datos?.Configuracion?.CategoriasCompartidas ?? []), [datos]);

  const abrirConfig = () => {
    const c = datos.Configuracion;
    setModo(c.ModoReparto || 'mitad');
    setCompartidas(c.CategoriasCompartidas || []);
    setPorcentajePrimero(Number(c.Porcentajes?.[miembros[0]?.UserId] ?? 50));
    setError('');
    setConfigAbierta(true);
  };

  const guardarConfig = async () => {
    setGuardando(true);
    setError('');
    try {
      const cuerpo = { ModoReparto: modo, CategoriasCompartidas: compartidas };
      if (modo === 'fijo' && miembros.length === 2) {
        cuerpo.Porcentajes = { [miembros[0].UserId]: porcentajePrimero, [miembros[1].UserId]: 100 - porcentajePrimero };
      }
      await apiPlan.put('/hogar', cuerpo);
      setConfigAbierta(false);
      cargar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const transferencia = datos?.Transferencias?.[0];
  const modoActual = MODOS.find(m => m.value === datos?.Configuracion?.ModoReparto) ?? MODOS[0];

  return (
    <Layout>
      <PageHeader
        eyebrow="Compartido"
        title="Hogar"
        subtitle="Quién pagó qué y cómo quedan las cuentas entre ustedes."
        actions={
          <>
            <PeriodPicker periodo={periodo} onChange={setPeriodo} />
            <button onClick={abrirConfig} disabled={!datos?.Configuracion} className="btn-secondary w-11 px-0 md:w-auto md:px-4" aria-label="Configurar reparto">
              <Icon name="settings" size={18} /> <span className="hidden md:inline">Reparto</span>
            </button>
          </>
        }
      />

      {cargando ? (
        <div className="flex flex-col gap-4">
          <div className="skeleton h-48 rounded-3xl" />
          <div className="card"><ListSkeleton rows={4} /></div>
        </div>
      ) : miembros.length === 0 ? (
        <div className="card"><EmptyState icon="users" title="Sin datos del hogar" description="No pudimos cargar la información del hogar. Intenta de nuevo." /></div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* --- SALDO ENTRE USTEDES --- */}
          <section className="card relative overflow-hidden rounded-3xl p-6 md:p-8 animate-fade-up">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/[0.06] blur-3xl" />
            <div className="relative">
              <p className="eyebrow">Para quedar a mano</p>
              {transferencia ? (
                <>
                  <p className="mt-4 text-lg text-muted">
                    <span className="text-ink">{primerNombre(transferencia.De)}</span> le debe a <span className="text-ink">{primerNombre(transferencia.Para)}</span>
                  </p>
                  <p className="mt-1 text-5xl font-medium tracking-tighter text-ink num md:text-6xl">{formatMonto(transferencia.Monto)}</p>
                </>
              ) : (
                <p className="mt-4 flex items-center gap-3 text-3xl font-medium tracking-tight text-ink md:text-4xl">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-positive/10 text-positive"><Icon name="check" size={20} strokeWidth={2.25} /></span>
                  Están a mano
                </p>
              )}
              <p className="mt-4 text-sm text-muted">
                Gastos compartidos del mes: <span className="text-ink num">{formatMonto(datos.TotalCompartido)}</span> · Reparto: <span className="text-ink">{modoActual.label.toLowerCase()}</span>
              </p>

              {/* Quién pagó lo compartido */}
              {datos.TotalCompartido > 0 && (
                <div className="mt-6">
                  <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
                    {miembros.map(m => (
                      <div key={m.UserId} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(m.PagadoCompartido / datos.TotalCompartido) * 100}%`, background: colorDe(m.UserId) }} />
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                    {miembros.map(m => (
                      <span key={m.UserId} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: colorDe(m.UserId) }} />
                        {primerNombre(m.Nombre)} pagó <span className="text-ink num">{Math.round((m.PagadoCompartido / datos.TotalCompartido) * 100)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* --- MIEMBROS --- */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {miembros.map((m, i) => (
              <section key={m.UserId} className="card p-5 animate-fade-up" style={{ animationDelay: `${60 + i * 40}ms` }}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorDe(m.UserId) }} />
                  <p className="font-medium text-ink">{m.Nombre}</p>
                  {m.EsYo && <span className="badge border-line text-faint">Tú</span>}
                </div>
                <dl className="divide-y divide-line text-sm">
                  {[
                    ['Pagó en compartidos', formatMonto(m.PagadoCompartido)],
                    [`Le corresponde (${m.Porcentaje}%)`, formatMonto(m.LeCorresponde)],
                    ['Gastos totales del mes', formatMonto(m.GastosTotales)],
                    ['Ingresos del mes', formatMonto(m.Ingresos)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-faint">{k}</dt>
                      <dd className="text-ink num">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className={`mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm ${Math.abs(m.Saldo) < 0.01 ? 'bg-white/[0.04] text-muted' : m.Saldo > 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                  <Icon name={Math.abs(m.Saldo) < 0.01 ? 'check' : m.Saldo > 0 ? 'arrowDown' : 'arrowUp'} size={15} />
                  {Math.abs(m.Saldo) < 0.01 ? 'Al día' : m.Saldo > 0 ? `Le deben ${formatMonto(m.Saldo)}` : `Debe ${formatMonto(-m.Saldo)}`}
                </p>
              </section>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* --- POR CATEGORÍA --- */}
            <section className="card p-5 md:p-6 animate-fade-up" style={{ animationDelay: '140ms' }}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-ink">Compartido por categoría</h2>
                <button onClick={abrirConfig} className="text-xs text-accent hover:underline">Cambiar</button>
              </div>
              {datos.PorCategoria.length === 0 ? (
                <p className="py-6 text-center text-sm text-faint">Sin gastos compartidos este mes.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {datos.PorCategoria.map(c => (
                    <li key={c.Categoria}>
                      <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted">{c.Categoria}</span><span className="text-ink num">{formatMonto(c.Total)}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-accent" style={{ width: `${(c.Total / datos.PorCategoria[0].Total) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* --- MOVIMIENTOS COMPARTIDOS --- */}
            <section className="card overflow-hidden lg:col-span-2 animate-fade-up" style={{ animationDelay: '180ms' }}>
              <h2 className="border-b border-line px-5 py-4 text-[15px] font-medium text-ink md:px-6">Gastos compartidos</h2>
              {datos.Movimientos.length === 0 ? (
                <EmptyState icon="users" title="Nada compartido aún" description="Elige qué categorías son del hogar o marca gastos como compartidos desde Gastos." />
              ) : (
                <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
                  {datos.Movimientos.map((g, i) => (
                    <li key={i} className="flex items-center gap-3.5 px-5 py-3.5 md:px-6">
                      <Avatar text={g.Comercio} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-ink">{g.Comercio}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-faint">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorDe(miembros.find(m => m.Nombre === g.PagadoPor)?.UserId) }} />
                          {g.EsMio ? 'Tú' : primerNombre(g.PagadoPor)} · {g.Categoria} · {formatFecha(g.Fecha)}
                        </p>
                      </div>
                      <span className="text-[15px] font-medium text-ink num">{formatMonto(g.MontoPEN)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* --- CONFIGURAR REPARTO --- */}
      <Modal open={configAbierta} onClose={() => setConfigAbierta(false)} title="Reparto del hogar" subtitle="Aplica a los dos, a todos los meses.">
        <div className="flex flex-col gap-6">
          <div>
            <span className="label">¿Cómo se reparten los gastos compartidos?</span>
            <div className="flex flex-col gap-2">
              {MODOS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModo(m.value)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${modo === m.value ? 'border-accent bg-accent/[0.07]' : 'border-line hover:border-line-strong'}`}
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${modo === m.value ? 'border-accent' : 'border-line-strong'}`}>
                    {modo === m.value && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">{m.label}</span>
                    <span className="block text-xs text-faint">{m.descripcion}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {modo === 'fijo' && miembros.length === 2 && (
            <div className="rounded-xl border border-line p-4 animate-fade-in">
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-ink">{primerNombre(miembros[0].Nombre)} <span className="num">{porcentajePrimero}%</span></span>
                <span className="text-ink">{primerNombre(miembros[1].Nombre)} <span className="num">{100 - porcentajePrimero}%</span></span>
              </div>
              <input type="range" min="0" max="100" step="5" value={porcentajePrimero} onChange={(e) => setPorcentajePrimero(Number(e.target.value))} className="w-full accent-[#D4F75A]" aria-label="Porcentaje" />
            </div>
          )}

          <div>
            <span className="label">Categorías que son del hogar</span>
            <p className="mb-3 text-xs text-faint">Sus gastos cuentan como compartidos. Puedes cambiar cualquier gasto a mano desde Gastos.</p>
            <div className="flex flex-wrap gap-2">
              {categoriasDisponibles.map(c => {
                const activa = compartidas.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCompartidas(lista => (activa ? lista.filter(x => x !== c) : [...lista, c]))}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${activa ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:border-line-strong'}`}
                  >
                    {activa && <Icon name="check" size={13} strokeWidth={2.5} />} {c}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
          <button onClick={guardarConfig} disabled={guardando} className="btn-primary h-12 w-full">
            {guardando ? <><Spinner /> Guardando…</> : 'Guardar reparto'}
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
