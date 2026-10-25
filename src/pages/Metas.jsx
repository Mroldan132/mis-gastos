import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { apiMetas, mensajeDeError } from '../services/api';
import { Icon, PageHeader, Modal, Field, AmountInput, EmptyState, Spinner, StatCard, Segmented } from '../components/ui';
import { formatMonto } from '../lib/format';

const ICONOS = ['🎯', '✈️', '🏠', '🚗', '💻', '🎓', '💍', '🛟'];

// Los mismos colores por miembro que usa la pantalla Hogar
const COLORES_MIEMBRO = ['#3987e5', '#d95926'];
const MODOS = { mitad: 'mitad y mitad', ingresos: 'según ingresos', fijo: 'porcentaje fijo' };

const primerNombre = (nombre = '') => nombre.split(/[ (]/)[0];
const progresoDe = (meta) => (meta.MontoObjetivo > 0 ? (meta.MontoActual / meta.MontoObjetivo) * 100 : 0);

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

// Quién puso cuánto en una meta del hogar y cuánto le falta a cada uno para su parte
function Aportes({ meta }) {
  const miembros = meta.Miembros ?? [];
  if (miembros.length === 0) return null;
  return (
    <div className="mt-5">
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-white/[0.06]">
        {miembros.map((m, idx) => (
          <div
            key={m.UserId}
            className="h-full first:rounded-l-full last:rounded-r-full transition-[width] duration-1000 ease-out"
            style={{ width: `${meta.MontoObjetivo > 0 ? Math.min((m.Aportado / meta.MontoObjetivo) * 100, 100) : 0}%`, background: COLORES_MIEMBRO[idx % COLORES_MIEMBRO.length] }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {miembros.map((m, idx) => (
          <li key={m.UserId} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORES_MIEMBRO[idx % COLORES_MIEMBRO.length] }} />
              <span className="truncate">{m.EsYo ? 'Tú' : primerNombre(m.Nombre)}</span>
              <span className="shrink-0 text-xs text-faint num">{m.Porcentaje}%</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="text-ink num">{formatMonto(m.Aportado)}</span>
              <span className={`block text-xs num ${m.Falta > 0 ? 'text-faint' : 'text-positive'}`}>
                {m.Falta > 0 ? `faltan ${formatMonto(m.Falta)}` : 'parte completa'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TarjetaMeta({ meta, indice, onAportar, onEditar }) {
  const progreso = progresoDe(meta);
  const completado = meta.Estado === 'Completada' || progreso >= 100;

  return (
    <article
      className={`card group relative flex flex-col overflow-hidden p-5 transition-colors hover:border-line-strong animate-fade-up ${completado ? 'border-positive/25' : ''}`}
      style={{ animationDelay: `${indice * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-elevated text-xl">{meta.Icono}</span>
            {meta.EsCompartida && <span className="badge border-line text-faint"><Icon name="users" size={12} /> Hogar</span>}
          </div>
          <h3 className="break-words text-lg font-medium leading-snug text-ink">{meta.Nombre}</h3>
          <p className="mt-1 text-sm text-faint">
            <span className="num">Objetivo {formatMonto(meta.MontoObjetivo)}</span>
            {meta.EsCompartida && meta.CreadaPor && <span> · creada por {primerNombre(meta.CreadaPor)}</span>}
          </p>
        </div>
        <Anillo progreso={progreso} completado={completado} />
      </div>

      {meta.EsCompartida && <Aportes meta={meta} />}

      <div className="mt-6 flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          <p className="eyebrow">{completado ? 'Logrado' : meta.EsCompartida ? 'Juntaron' : 'Ahorrado'}</p>
          <p className="mt-1.5 text-lg font-medium text-ink num">{formatMonto(meta.MontoActual)}</p>
          {!completado && <p className="text-xs text-faint num">Faltan {formatMonto(Math.max(0, meta.MontoObjetivo - meta.MontoActual))}</p>}
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => onEditar(meta)} className="btn-ghost h-10 w-10 px-0" aria-label="Editar meta">
            <Icon name="edit" size={16} />
          </button>
          {completado ? (
            <span className="badge border-positive/20 bg-positive/10 text-positive"><Icon name="check" size={12} strokeWidth={2.5} /> Completada</span>
          ) : (
            <button onClick={() => onAportar(meta)} className="btn-secondary h-10 px-3.5 text-[13px]">
              <Icon name="plus" size={15} /> Aportar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Metas() {
  const [metas, setMetas] = useState([]);
  const [metasHogar, setMetasHogar] = useState([]);
  const [modoReparto, setModoReparto] = useState('mitad');
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('mias'); // 'mias' | 'hogar'
  const [aviso, setAviso] = useState(null);

  // Crear / editar
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [icono, setIcono] = useState('🎯');
  const [compartida, setCompartida] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Aportar
  const [aporteAbierto, setAporteAbierto] = useState(false);
  const [metaSeleccionada, setMetaSeleccionada] = useState(null);
  const [montoAhorrar, setMontoAhorrar] = useState('');
  const [ahorrando, setAhorrando] = useState(false);

  const cargar = async () => {
    try {
      const { data } = await apiMetas.get('/metas');
      if (data.Success) {
        setMetas(data.Metas || []);
        setMetasHogar(data.MetasHogar || []);
        setModoReparto(data.ModoReparto || 'mitad');
      }
    } catch (e) { console.error('Error cargando metas:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const mostrarAviso = (texto, tono = 'accent') => {
    setAviso({ texto, tono });
    setTimeout(() => setAviso(null), 4500);
  };

  const abrirCrear = () => {
    setEditando(null);
    setNombre('');
    setObjetivo('');
    setIcono('🎯');
    setCompartida(vista === 'hogar');
    setError('');
    setFormAbierto(true);
  };

  const abrirEditar = (meta) => {
    setEditando(meta);
    setNombre(meta.Nombre);
    setObjetivo(String(meta.MontoObjetivo));
    setIcono(meta.Icono || '🎯');
    setCompartida(!!meta.EsCompartida);
    setError('');
    setFormAbierto(true);
  };

  const guardarMeta = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (editando) {
        await apiMetas.put('/metas', { MetaId: editando.MetaId, Nombre: nombre, MontoObjetivo: parseFloat(objetivo), Icono: icono });
      } else {
        await apiMetas.post('/metas', { Nombre: nombre, Categoria: 'Ahorro', MontoObjetivo: parseFloat(objetivo), Icono: icono, Compartida: compartida });
        setVista(compartida ? 'hogar' : 'mias');
      }
      setFormAbierto(false);
      cargar();
    } catch (err) { setError(mensajeDeError(err)); }
    finally { setGuardando(false); }
  };

  const eliminarMeta = async () => {
    if (!editando) return;
    const confirmado = window.confirm(`¿Eliminar la meta "${editando.Nombre}"?\nLos aportes ya registrados quedan como gastos de Ahorro.`);
    if (!confirmado) return;
    setGuardando(true);
    setError('');
    try {
      await apiMetas.delete(`/metas?metaId=${editando.MetaId}`);
      setFormAbierto(false);
      cargar();
    } catch (err) { setError(mensajeDeError(err)); }
    finally { setGuardando(false); }
  };

  const abrirAporte = (meta) => {
    setMetaSeleccionada(meta);
    setMontoAhorrar('');
    setError('');
    setAporteAbierto(true);
  };

  const aportar = async (e) => {
    e.preventDefault();
    setAhorrando(true);
    setError('');
    try {
      const { data } = await apiMetas.put('/metas/aportar', { MetaId: metaSeleccionada.MetaId, MontoAporte: parseFloat(montoAhorrar) });
      setAporteAbierto(false);
      if (data.Completada) {
        mostrarAviso(metaSeleccionada.EsCompartida ? `🎉 ¡Lo lograron juntos! "${metaSeleccionada.Nombre}" está completa.` : `🎉 ¡Lo lograste! "${metaSeleccionada.Nombre}" está completa.`, 'positive');
      }
      cargar();
    } catch (err) { setError(mensajeDeError(err)); }
    finally { setAhorrando(false); }
  };

  const lista = vista === 'hogar' ? metasHogar : metas;

  const resumen = useMemo(() => ({
    ahorrado: lista.reduce((s, m) => s + (Number(m.MontoActual) || 0), 0),
    objetivo: lista.reduce((s, m) => s + (Number(m.MontoObjetivo) || 0), 0),
    miAporte: lista.reduce((s, m) => s + (Number(m.Miembros?.find(x => x.EsYo)?.Aportado) || 0), 0),
    completadas: lista.filter(m => m.Estado === 'Completada' || (m.MontoObjetivo > 0 && m.MontoActual >= m.MontoObjetivo)).length,
  }), [lista]);

  const miParte = metaSeleccionada?.Miembros?.find(m => m.EsYo);

  const botonNueva = (
    <button onClick={abrirCrear} className="btn-primary">
      <Icon name="plus" size={18} /> Nueva meta
    </button>
  );

  return (
    <Layout>
      <PageHeader
        eyebrow="Ahorro"
        title="Metas"
        subtitle="Convierte pequeños ahorros en grandes logros, solo o entre los dos."
        actions={lista.length > 0 && botonNueva}
      />

      <Segmented
        className="mb-6"
        value={vista}
        onChange={setVista}
        options={[
          { value: 'mias', label: 'Mis metas', count: metas.length },
          { value: 'hogar', label: 'Del hogar', count: metasHogar.length },
        ]}
      />

      {aviso && (
        <div className={`mb-5 rounded-xl px-4 py-3 text-sm animate-fade-in ${aviso.tono === 'positive' ? 'bg-positive/10 text-positive' : 'bg-accent/10 text-accent'}`}>
          {aviso.texto}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : lista.length === 0 ? (
        <div className="card">
          {vista === 'hogar' ? (
            <EmptyState icon="users" title="Aún no tienen metas juntos" description="Un viaje, el depa, un fondo de emergencia: júntenlo entre los dos. Cada uno aporta desde su cuenta." action={botonNueva} />
          ) : (
            <EmptyState icon="target" title="Aún no tienes metas" description="Ese viaje, la laptop nueva o tu fondo de emergencia: empieza hoy." action={botonNueva} />
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            <StatCard label={vista === 'hogar' ? 'Juntaron' : 'Ahorrado'} value={formatMonto(resumen.ahorrado)} icon="piggy" tone="accent" className="col-span-2 md:col-span-1" />
            {vista === 'hogar' ? (
              <StatCard label="Pusiste tú" value={formatMonto(resumen.miAporte)} icon="users" hint={`Reparto: ${MODOS[modoReparto] ?? modoReparto}`} style={{ animationDelay: '40ms' }} />
            ) : (
              <StatCard label="Objetivo total" value={formatMonto(resumen.objetivo)} icon="target" style={{ animationDelay: '40ms' }} />
            )}
            <StatCard label="Completadas" value={`${resumen.completadas} / ${lista.length}`} icon="check" tone="positive" style={{ animationDelay: '80ms' }} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((meta, i) => (
              <TarjetaMeta key={meta.MetaId} meta={meta} indice={i} onAportar={abrirAporte} onEditar={abrirEditar} />
            ))}
          </div>
        </>
      )}

      {/* --- CREAR / EDITAR META --- */}
      <Modal
        open={formAbierto}
        onClose={() => setFormAbierto(false)}
        title={editando ? 'Editar meta' : 'Nueva meta'}
        subtitle={editando ? (editando.EsCompartida ? 'Meta del hogar: los cambios los ven los dos.' : 'Ajusta el nombre o el monto.') : 'Define cuánto quieres juntar.'}
      >
        <form onSubmit={guardarMeta} className="flex flex-col gap-5">
          {!editando && (
            <div>
              <span className="label">¿De quién es la meta?</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: false, titulo: 'Mía', detalle: 'Solo tú la ves y aportas.', icono: 'target' },
                  { value: true, titulo: 'Del hogar', detalle: 'Los dos aportan y la ven.', icono: 'users' },
                ].map(op => (
                  <button
                    key={String(op.value)}
                    type="button"
                    onClick={() => setCompartida(op.value)}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3 text-left transition-colors ${compartida === op.value ? 'border-accent bg-accent/[0.07]' : 'border-line hover:border-line-strong'}`}
                  >
                    <span className={`flex items-center gap-2 text-sm font-medium ${compartida === op.value ? 'text-accent' : 'text-ink'}`}><Icon name={op.icono} size={15} /> {op.titulo}</span>
                    <span className="text-xs text-faint">{op.detalle}</span>
                  </button>
                ))}
              </div>
              {compartida && (
                <p className="mt-2 text-xs text-faint animate-fade-in">
                  La parte de cada uno se calcula con el reparto del hogar ({MODOS[modoReparto] ?? modoReparto}). Se cambia desde Hogar.
                </p>
              )}
            </div>
          )}

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
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" placeholder={compartida ? 'Ej. Viaje a Cusco' : 'Ej. Laptop nueva'} required />
          </Field>

          <Field label="Monto a alcanzar">
            <AmountInput value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
          </Field>

          {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}

          <button type="submit" disabled={guardando} className="btn-primary mt-1 h-12 w-full">
            {guardando ? <><Spinner /> Guardando…</> : editando ? 'Guardar cambios' : compartida ? 'Crear meta del hogar' : 'Crear meta'}
          </button>

          {editando && (
            <button type="button" onClick={eliminarMeta} disabled={guardando} className="btn-ghost h-11 w-full text-negative">
              <Icon name="trash" size={16} /> Eliminar meta
            </button>
          )}
        </form>
      </Modal>

      {/* --- APORTAR --- */}
      <Modal
        open={aporteAbierto}
        onClose={() => setAporteAbierto(false)}
        title="Aportar"
        subtitle={metaSeleccionada && `${metaSeleccionada.Icono} ${metaSeleccionada.Nombre}`}
        size="sm"
      >
        <form onSubmit={aportar} className="flex flex-col gap-5">
          <Field
            label="¿Cuánto vas a separar?"
            hint={miParte
              ? `Se registra como tu gasto de Ahorro. Tu parte es ${formatMonto(miParte.LeCorresponde)} y ${miParte.Falta > 0 ? `te faltan ${formatMonto(miParte.Falta)}` : 'ya la cubriste'}.`
              : 'Se registrará como un gasto de la categoría Ahorro.'}
          >
            <AmountInput value={montoAhorrar} onChange={(e) => setMontoAhorrar(e.target.value)} autoFocus />
          </Field>

          {miParte && miParte.Falta > 0 && (
            <button type="button" onClick={() => setMontoAhorrar(String(miParte.Falta))} className="btn-secondary h-10 w-full text-[13px]">
              Completar mi parte · {formatMonto(miParte.Falta)}
            </button>
          )}

          {metaSeleccionada && Number(montoAhorrar) > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 text-sm animate-fade-in">
              <span className="text-muted">Nuevo progreso</span>
              <span className="font-medium text-ink num">
                {Math.min(100, ((metaSeleccionada.MontoActual + Number(montoAhorrar)) / metaSeleccionada.MontoObjetivo) * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}

          <button type="submit" disabled={ahorrando} className="btn-primary h-12 w-full">
            {ahorrando ? <><Spinner /> Procesando…</> : 'Confirmar aporte'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
