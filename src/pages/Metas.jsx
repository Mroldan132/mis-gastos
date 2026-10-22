import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { apiMetas } from '../services/api';
import { Icon, PageHeader, Modal, Field, AmountInput, EmptyState, Spinner, StatCard } from '../components/ui';
import { formatMonto } from '../lib/format';

const ICONOS = ['🎯', '✈️', '🏠', '🚗', '💻', '🎓', '💍', '🛟'];

function Anillo({ progreso, completado }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const valor = Math.min(Math.max(progreso, 0), 100);
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="5" strokeLinecap="round"
          stroke={completado ? '#34D399' : '#D4F75A'}
          strokeDasharray={c}
          strokeDashoffset={c - (valor / 100) * c}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-medium text-ink num">{Math.round(valor)}%</span>
    </div>
  );
}

export default function Metas() {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [icono, setIcono] = useState('🎯');
  const [creando, setCreando] = useState(false);

  const [isAhorroModalOpen, setIsAhorroModalOpen] = useState(false);
  const [metaSeleccionada, setMetaSeleccionada] = useState(null);
  const [montoAhorrar, setMontoAhorrar] = useState('');
  const [ahorrando, setAhorrando] = useState(false);

  const fetchMetas = async () => {
    const userId = localStorage.getItem('userId');
    try {
      const response = await apiMetas.get(`/metas?userId=${userId}`);
      if (response.data.Success) setMetas(response.data.Metas);
    } catch (error) { console.error("Error cargando metas:", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMetas(); }, []);

  const handleCrearMeta = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      const response = await apiMetas.post('/metas', {
        UserId: localStorage.getItem('userId'),
        Nombre: nombre,
        Categoria: "Ahorro",
        MontoObjetivo: parseFloat(objetivo),
        Icono: icono
      });

      if (response.data.Success) {
        setIsModalOpen(false);
        setNombre('');
        setObjetivo('');
        setIcono('🎯');
        fetchMetas();
      }
    } catch (error) { console.error("Error al crear meta", error); }
    finally { setCreando(false); }
  };

  const handleAhorrar = async (e) => {
    e.preventDefault();
    setAhorrando(true);
    try {
      const response = await apiMetas.put('/metas/aportar', {
        UserId: localStorage.getItem('userId'),
        MetaId: metaSeleccionada.MetaId,
        MontoAporte: parseFloat(montoAhorrar)
      });
      if (response.data.Success) {
        setIsAhorroModalOpen(false);
        setMontoAhorrar('');
        fetchMetas();
      }
    } catch (error) { console.error("Error al aportar:", error); }
    finally { setAhorrando(false); }
  };

  const resumen = useMemo(() => ({
    ahorrado: metas.reduce((s, m) => s + (Number(m.MontoActual) || 0), 0),
    objetivo: metas.reduce((s, m) => s + (Number(m.MontoObjetivo) || 0), 0),
    completadas: metas.filter(m => m.MontoObjetivo > 0 && m.MontoActual >= m.MontoObjetivo).length,
  }), [metas]);

  const botonNueva = (
    <button onClick={() => setIsModalOpen(true)} className="btn-primary">
      <Icon name="plus" size={18} /> Nueva meta
    </button>
  );

  return (
    <Layout>
      <PageHeader
        eyebrow="Ahorro"
        title="Metas"
        subtitle="Convierte pequeños ahorros en grandes logros."
        actions={metas.length > 0 && botonNueva}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : metas.length === 0 ? (
        <div className="card">
          <EmptyState icon="target" title="Aún no tienes metas" description="Ese viaje, la laptop nueva o tu fondo de emergencia: empieza hoy." action={botonNueva} />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            <StatCard label="Ahorrado" value={formatMonto(resumen.ahorrado)} icon="piggy" tone="accent" className="col-span-2 md:col-span-1" />
            <StatCard label="Objetivo total" value={formatMonto(resumen.objetivo)} icon="target" style={{ animationDelay: '40ms' }} />
            <StatCard label="Completadas" value={`${resumen.completadas} / ${metas.length}`} icon="check" tone="positive" style={{ animationDelay: '80ms' }} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metas.map((meta, i) => {
              const progreso = meta.MontoObjetivo > 0 ? (meta.MontoActual / meta.MontoObjetivo) * 100 : 0;
              const completado = progreso >= 100;

              return (
                <article
                  key={meta.MetaId}
                  className={`card group relative flex flex-col overflow-hidden p-5 transition-colors hover:border-line-strong animate-fade-up ${completado ? 'border-positive/25' : ''}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-line bg-elevated text-xl">{meta.Icono}</span>
                      <h3 className="break-words text-lg font-medium leading-snug text-ink">{meta.Nombre}</h3>
                      <p className="mt-1 text-sm text-faint num">Objetivo {formatMonto(meta.MontoObjetivo)}</p>
                    </div>
                    <Anillo progreso={progreso} completado={completado} />
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-3 border-t border-line pt-4">
                    <div>
                      <p className="eyebrow">{completado ? 'Logrado' : 'Ahorrado'}</p>
                      <p className="mt-1.5 text-lg font-medium text-ink num">{formatMonto(meta.MontoActual)}</p>
                      {!completado && <p className="text-xs text-faint num">Faltan {formatMonto(meta.MontoObjetivo - meta.MontoActual)}</p>}
                    </div>

                    {completado ? (
                      <span className="badge border-positive/20 bg-positive/10 text-positive"><Icon name="check" size={12} strokeWidth={2.5} /> Completada</span>
                    ) : (
                      <button
                        onClick={() => { setMetaSeleccionada(meta); setIsAhorroModalOpen(true); }}
                        className="btn-secondary h-10 px-3.5 text-[13px]"
                      >
                        <Icon name="plus" size={15} /> Aportar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* --- CREAR META --- */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva meta" subtitle="Define cuánto quieres juntar.">
        <form onSubmit={handleCrearMeta} className="flex flex-col gap-5">
          <div>
            <span className="label">Ícono</span>
            <div className="grid grid-cols-8 gap-1.5">
              {ICONOS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcono(ic)}
                  className={`grid aspect-square place-items-center rounded-xl border text-lg transition-all ${icono === ic ? 'border-accent bg-accent/10' : 'border-line hover:border-line-strong'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <Field label="Nombre">
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" placeholder="Ej. Laptop nueva" required />
          </Field>

          <Field label="Monto a alcanzar">
            <AmountInput value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
          </Field>

          <button type="submit" disabled={creando} className="btn-primary mt-1 h-12 w-full">
            {creando ? <><Spinner /> Guardando…</> : 'Crear meta'}
          </button>
        </form>
      </Modal>

      {/* --- APORTAR --- */}
      <Modal
        open={isAhorroModalOpen}
        onClose={() => setIsAhorroModalOpen(false)}
        title="Aportar"
        subtitle={metaSeleccionada && `${metaSeleccionada.Icono} ${metaSeleccionada.Nombre}`}
        size="sm"
      >
        <form onSubmit={handleAhorrar} className="flex flex-col gap-5">
          <Field label="¿Cuánto vas a separar?" hint="Se registrará como un gasto de la categoría Ahorro.">
            <AmountInput value={montoAhorrar} onChange={(e) => setMontoAhorrar(e.target.value)} autoFocus />
          </Field>
          {metaSeleccionada && Number(montoAhorrar) > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 text-sm animate-fade-in">
              <span className="text-muted">Nuevo progreso</span>
              <span className="font-medium text-ink num">
                {Math.min(100, ((metaSeleccionada.MontoActual + Number(montoAhorrar)) / metaSeleccionada.MontoObjetivo) * 100).toFixed(0)}%
              </span>
            </div>
          )}
          <button type="submit" disabled={ahorrando} className="btn-primary h-12 w-full">
            {ahorrando ? <><Spinner /> Procesando…</> : 'Confirmar aporte'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
