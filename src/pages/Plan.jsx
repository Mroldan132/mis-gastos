import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiPlan, mensajeDeError } from '../services/api';
import { Icon, PageHeader, PeriodPicker, Segmented, Modal, Field, AmountInput, EmptyState, ListSkeleton, ProgressBar, Spinner, StatCard } from '../components/ui';
import { formatMonto, formatFecha, periodoActual, periodoTexto, unirCategorias } from '../lib/format';

// Estado de un presupuesto: el color nunca va solo, siempre con ícono y texto
const estadoPresupuesto = (p) => {
  if (p.Porcentaje > 100) return { tono: 'negative', icono: 'alert', texto: `Te pasaste por ${formatMonto(-p.Restante)}`, clase: 'text-negative' };
  if (p.Porcentaje >= 80) return { tono: 'warning', icono: 'alert', texto: `Quedan ${formatMonto(p.Restante)}`, clase: 'text-warning' };
  return { tono: 'accent', icono: 'check', texto: `Quedan ${formatMonto(p.Restante)}`, clase: 'text-muted' };
};

const estadoFijo = (f) => {
  if (!f.Activo) return { texto: 'En pausa', clase: 'border-line text-faint', icono: 'clock' };
  if (f.Pagado) return { texto: 'Pagado', clase: 'border-positive/20 bg-positive/10 text-positive', icono: 'check' };
  if (f.Vencido) return { texto: `Venció hace ${-f.DiasRestantes} ${f.DiasRestantes === -1 ? 'día' : 'días'}`, clase: 'border-negative/25 bg-negative/10 text-negative', icono: 'alert' };
  if (f.DiasRestantes === 0) return { texto: 'Vence hoy', clase: 'border-warning/25 bg-warning/10 text-warning', icono: 'clock' };
  if (f.DiasRestantes <= 5) return { texto: `Vence en ${f.DiasRestantes} ${f.DiasRestantes === 1 ? 'día' : 'días'}`, clase: 'border-warning/25 bg-warning/10 text-warning', icono: 'clock' };
  return { texto: `Vence el ${formatFecha(f.Vencimiento).replace(/ \d{4}$/, '')}`, clase: 'border-line text-muted', icono: 'calendar' };
};

const FIJO_VACIO = { FijoId: null, Nombre: '', Monto: '', Moneda: 'PEN', Categoria: 'Servicios', DiaVencimiento: '', Activo: true };

export default function Plan() {
  const [searchParams] = useSearchParams();
  const [pestana, setPestana] = useState(searchParams.get('tab') === 'fijos' ? 'fijos' : 'presupuestos');
  const [periodo, setPeriodo] = useState(periodoActual);
  const mes = periodoTexto(periodo);

  const [presupuestos, setPresupuestos] = useState(null);
  const [fijos, setFijos] = useState(null);

  // Editor de presupuestos
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [filasEditor, setFilasEditor] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Pagos fijos
  const [fijoEditando, setFijoEditando] = useState(null);
  const [fijoPorPagar, setFijoPorPagar] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const cargarPresupuestos = async () => {
    try {
      const { data } = await apiPlan.get(`/presupuestos?mes=${mes}`);
      setPresupuestos(data);
    } catch (e) { console.error(e); setPresupuestos({ Mes: mes, Presupuestos: [], SinPresupuesto: [] }); }
  };

  const cargarFijos = async () => {
    try {
      const { data } = await apiPlan.get(`/fijos?mes=${mes}`);
      setFijos(data);
    } catch (e) { console.error(e); setFijos({ Mes: mes, Fijos: [] }); }
  };

  useEffect(() => {
    cargarPresupuestos();
    cargarFijos();
  }, [mes]);

  // Mientras llegan los datos del mes elegido se muestra la carga (los del mes anterior no sirven)
  const cargandoPresupuestos = !presupuestos || presupuestos.Mes !== mes;
  const cargandoFijos = !fijos || fijos.Mes !== mes;

  const categorias = useMemo(() => unirCategorias(
    (presupuestos?.Presupuestos ?? []).map(p => p.Categoria),
    (presupuestos?.SinPresupuesto ?? []).map(p => p.Categoria),
  ), [presupuestos]);

  // --- PRESUPUESTOS ---
  const abrirEditor = (categoriaNueva) => {
    const actuales = (presupuestos?.Presupuestos ?? []).map(p => ({ Categoria: p.Categoria, Monto: String(p.Monto) }));
    if (categoriaNueva && !actuales.some(f => f.Categoria === categoriaNueva)) actuales.push({ Categoria: categoriaNueva, Monto: '' });
    if (actuales.length === 0) actuales.push({ Categoria: '', Monto: '' });
    setFilasEditor(actuales);
    setError('');
    setEditorAbierto(true);
  };

  const guardarPresupuestos = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await apiPlan.put('/presupuestos', {
        Presupuestos: filasEditor.filter(f => f.Categoria.trim() && Number(f.Monto) > 0).map(f => ({ Categoria: f.Categoria.trim(), Monto: Number(f.Monto) })),
      });
      setEditorAbierto(false);
      cargarPresupuestos();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  // --- PAGOS FIJOS ---
  const abrirFijo = (fijo) => {
    setFijoEditando(fijo ? { ...fijo, Monto: String(fijo.Monto), DiaVencimiento: String(fijo.DiaVencimiento) } : { ...FIJO_VACIO });
    setConfirmarBorrado(false);
    setError('');
  };

  const guardarFijo = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    const cuerpo = {
      FijoId: fijoEditando.FijoId,
      Nombre: fijoEditando.Nombre,
      Monto: Number(fijoEditando.Monto),
      Moneda: fijoEditando.Moneda,
      Categoria: fijoEditando.Categoria,
      DiaVencimiento: Number(fijoEditando.DiaVencimiento),
      Activo: fijoEditando.Activo,
    };
    try {
      if (fijoEditando.FijoId) await apiPlan.put('/fijos', cuerpo);
      else await apiPlan.post('/fijos', cuerpo);
      setFijoEditando(null);
      cargarFijos();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const borrarFijo = async () => {
    setGuardando(true);
    try {
      await apiPlan.delete(`/fijos?fijoId=${fijoEditando.FijoId}`);
      setFijoEditando(null);
      cargarFijos();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const abrirPago = (fijo) => {
    setFijoPorPagar(fijo);
    setMontoPago(String(fijo.Monto));
    setError('');
  };

  const pagarFijo = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await apiPlan.post('/fijos/pagar', { FijoId: fijoPorPagar.FijoId, Mes: mes, Monto: Number(montoPago) });
      setFijoPorPagar(null);
      cargarFijos();
      cargarPresupuestos();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const lista = presupuestos?.Presupuestos ?? [];
  const totalPct = presupuestos?.TotalPresupuesto > 0 ? (presupuestos.TotalGastado / presupuestos.TotalPresupuesto) * 100 : 0;
  const listaFijos = fijos?.Fijos ?? [];

  return (
    <Layout>
      <PageHeader
        eyebrow="Planificación"
        title="Plan del mes"
        subtitle="Ponle tope a cada categoría y no se te pase ningún pago fijo."
        actions={<PeriodPicker periodo={periodo} onChange={setPeriodo} />}
      />

      <Segmented
        className="mb-5"
        value={pestana}
        onChange={setPestana}
        options={[
          { value: 'presupuestos', label: 'Presupuestos', count: lista.length || null },
          { value: 'fijos', label: 'Pagos fijos', count: fijos?.CantidadPendiente || null },
        ]}
      />

      {/* ==================== PRESUPUESTOS ==================== */}
      {pestana === 'presupuestos' && (
        cargandoPresupuestos ? (
          <div className="card"><ListSkeleton rows={4} /></div>
        ) : lista.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="calendar"
              title="Aún no tienes presupuestos"
              description="Define cuánto quieres gastar como máximo en cada categoría y te avisamos cuando te acerques."
              action={<button onClick={() => abrirEditor()} className="btn-primary"><Icon name="plus" size={18} /> Crear presupuestos</button>}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <section className="card p-5 md:p-6 animate-fade-up">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Gastado de lo presupuestado</p>
                  <p className="mt-3 text-3xl font-medium tracking-tight text-ink num md:text-4xl">
                    {formatMonto(presupuestos.TotalGastado)}
                    <span className="ml-2 text-base text-faint">de {formatMonto(presupuestos.TotalPresupuesto)}</span>
                  </p>
                </div>
                <button onClick={() => abrirEditor()} className="btn-secondary"><Icon name="edit" size={16} /> Editar</button>
              </div>
              <ProgressBar value={totalPct} tone={totalPct > 100 ? 'negative' : totalPct >= 80 ? 'warning' : 'accent'} className="mt-5 h-2" />
            </section>

            <section className="card divide-y divide-line animate-fade-up" style={{ animationDelay: '60ms' }}>
              {lista.map(p => {
                const estado = estadoPresupuesto(p);
                return (
                  <div key={p.Categoria} className="p-4 md:px-6 md:py-5">
                    <div className="mb-2.5 flex items-baseline justify-between gap-3">
                      <p className="truncate font-medium text-ink">{p.Categoria}</p>
                      <p className="shrink-0 text-sm text-muted num">
                        <span className="text-ink">{formatMonto(p.Gastado)}</span> / {formatMonto(p.Monto)}
                      </p>
                    </div>
                    <ProgressBar value={p.Porcentaje} tone={estado.tono} />
                    <p className={`mt-2 flex items-center gap-1.5 text-xs ${estado.clase}`}>
                      <Icon name={estado.icono} size={13} /> {estado.texto} · <span className="num">{Math.round(p.Porcentaje)}%</span>
                    </p>
                  </div>
                );
              })}
            </section>

            {presupuestos.SinPresupuesto?.length > 0 && (
              <section className="card p-5 md:p-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
                <p className="eyebrow mb-4">Gastaste en estas categorías sin presupuesto</p>
                <div className="flex flex-wrap gap-2">
                  {presupuestos.SinPresupuesto.slice(0, 12).map(s => (
                    <button key={s.Categoria} onClick={() => abrirEditor(s.Categoria)} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink">
                      {s.Categoria} <span className="text-faint num">{formatMonto(s.Gastado)}</span> <Icon name="plus" size={14} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      )}

      {/* ==================== PAGOS FIJOS ==================== */}
      {pestana === 'fijos' && (
        cargandoFijos ? (
          <div className="card"><ListSkeleton rows={4} /></div>
        ) : listaFijos.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="calendar"
              title="Sin pagos fijos"
              description="Alquiler, luz, internet, colegio, suscripciones… regístralos una vez y te recordamos cada mes."
              action={<button onClick={() => abrirFijo(null)} className="btn-primary"><Icon name="plus" size={18} /> Agregar pago fijo</button>}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              <StatCard label="Por pagar este mes" value={formatMonto(fijos.TotalPendiente)} icon="clock" className="col-span-2 md:col-span-1" />
              <StatCard label="Pendientes" value={fijos.CantidadPendiente} icon="calendar" style={{ animationDelay: '40ms' }} />
              <StatCard label="Total mensual" value={formatMonto(fijos.TotalMensual)} icon="receipt" style={{ animationDelay: '80ms' }} />
            </div>

            <section className="card divide-y divide-line animate-fade-up" style={{ animationDelay: '60ms' }}>
              {listaFijos.map(f => {
                const estado = estadoFijo(f);
                return (
                  <div key={f.FijoId} className={`flex items-center gap-3.5 p-4 md:px-6 ${!f.Activo ? 'opacity-55' : ''}`}>
                    <button onClick={() => abrirFijo(f)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-elevated text-sm font-medium text-muted num">{f.DiaVencimiento}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-ink">{f.Nombre}</p>
                        <span className={`badge mt-1 ${estado.clase}`}><Icon name={estado.icono} size={12} /> {estado.texto}</span>
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-[15px] font-medium text-ink num">{formatMonto(f.Monto, f.Moneda)}</span>
                      {f.Activo && !f.Pagado && (
                        <button onClick={() => abrirPago(f)} className="btn-primary h-8 px-3 text-[13px]"><Icon name="check" size={14} strokeWidth={2.25} /> Pagar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            <button onClick={() => abrirFijo(null)} className="btn-secondary self-start"><Icon name="plus" size={16} /> Agregar pago fijo</button>
          </div>
        )
      )}

      <datalist id="categorias-plan">
        {categorias.map(c => <option key={c} value={c} />)}
      </datalist>

      {/* --- EDITOR DE PRESUPUESTOS --- */}
      <Modal open={editorAbierto} onClose={() => setEditorAbierto(false)} title="Presupuestos" subtitle="Tope mensual por categoría. Se repite cada mes.">
        <form onSubmit={guardarPresupuestos} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            {filasEditor.map((fila, i) => (
              <div key={i} className="flex gap-2">
                <input
                  list="categorias-plan"
                  value={fila.Categoria}
                  onChange={(e) => setFilasEditor(filas => filas.map((f, j) => (j === i ? { ...f, Categoria: e.target.value } : f)))}
                  placeholder="Categoría"
                  className="input min-w-0 flex-1"
                />
                <div className="relative w-32 shrink-0">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">S/</span>
                  <input
                    type="number" inputMode="decimal" min="0" step="1"
                    value={fila.Monto}
                    onChange={(e) => setFilasEditor(filas => filas.map((f, j) => (j === i ? { ...f, Monto: e.target.value } : f)))}
                    placeholder="0"
                    className="input pl-9 num"
                  />
                </div>
                <button type="button" onClick={() => setFilasEditor(filas => filas.filter((_, j) => j !== i))} className="btn-ghost h-12 w-11 shrink-0 px-0" aria-label="Quitar">
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setFilasEditor(filas => [...filas, { Categoria: '', Monto: '' }])} className="btn-ghost self-start px-2 text-accent hover:text-accent">
            <Icon name="plus" size={16} /> Agregar categoría
          </button>

          {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
          <button type="submit" disabled={guardando} className="btn-primary h-12 w-full">
            {guardando ? <><Spinner /> Guardando…</> : 'Guardar presupuestos'}
          </button>
        </form>
      </Modal>

      {/* --- CREAR / EDITAR PAGO FIJO --- */}
      <Modal open={!!fijoEditando} onClose={() => setFijoEditando(null)} title={fijoEditando?.FijoId ? 'Editar pago fijo' : 'Nuevo pago fijo'} subtitle="Se repite cada mes.">
        {fijoEditando && !confirmarBorrado && (
          <form onSubmit={guardarFijo} className="flex flex-col gap-5">
            <Field label="Nombre">
              <input type="text" value={fijoEditando.Nombre} onChange={(e) => setFijoEditando(f => ({ ...f, Nombre: e.target.value }))} className="input" placeholder="Ej. Alquiler, Luz del Sur, Netflix" required />
            </Field>
            <Segmented value={fijoEditando.Moneda} onChange={(v) => setFijoEditando(f => ({ ...f, Moneda: v }))} options={[{ value: 'PEN', label: 'Soles (S/)' }, { value: 'USD', label: 'Dólares ($)' }]} />
            <Field label="Monto habitual" hint="Si un mes viene distinto (como la luz), lo ajustas al pagar.">
              <AmountInput value={fijoEditando.Monto} onChange={(e) => setFijoEditando(f => ({ ...f, Monto: e.target.value }))} moneda={fijoEditando.Moneda} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Día de pago">
                <input type="number" inputMode="numeric" min="1" max="31" value={fijoEditando.DiaVencimiento} onChange={(e) => setFijoEditando(f => ({ ...f, DiaVencimiento: e.target.value }))} className="input num" placeholder="1 – 31" required />
              </Field>
              <Field label="Categoría">
                <input list="categorias-plan" value={fijoEditando.Categoria} onChange={(e) => setFijoEditando(f => ({ ...f, Categoria: e.target.value }))} className="input" required />
              </Field>
            </div>
            {fijoEditando.FijoId && (
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line px-4 py-3">
                <span className="text-sm text-ink">Activo <span className="block text-xs text-faint">Pausa los que no pagarás por un tiempo</span></span>
                <input type="checkbox" checked={fijoEditando.Activo} onChange={(e) => setFijoEditando(f => ({ ...f, Activo: e.target.checked }))} className="h-5 w-5 accent-[#D4F75A]" />
              </label>
            )}
            {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
            <button type="submit" disabled={guardando} className="btn-primary h-12 w-full">
              {guardando ? <><Spinner /> Guardando…</> : 'Guardar'}
            </button>
            {fijoEditando.FijoId && (
              <button type="button" onClick={() => setConfirmarBorrado(true)} className="btn-ghost h-10 text-negative/80 hover:bg-negative/10 hover:text-negative">
                <Icon name="trash" size={16} /> Eliminar pago fijo
              </button>
            )}
          </form>
        )}
        {fijoEditando && confirmarBorrado && (
          <>
            <p className="mb-6 text-sm text-muted">Se eliminará <span className="text-ink">{fijoEditando.Nombre}</span>. Los pagos que ya registraste quedan en tus gastos.</p>
            {error && <p className="mb-4 rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmarBorrado(false)} className="btn-secondary h-12">Cancelar</button>
              <button onClick={borrarFijo} disabled={guardando} className="btn h-12 bg-negative text-canvas hover:bg-negative/90">{guardando ? <Spinner /> : 'Eliminar'}</button>
            </div>
          </>
        )}
      </Modal>

      {/* --- PAGAR FIJO --- */}
      <Modal open={!!fijoPorPagar} onClose={() => setFijoPorPagar(null)} title="Registrar pago" subtitle={fijoPorPagar?.Nombre} size="sm">
        {fijoPorPagar && (
          <form onSubmit={pagarFijo} className="flex flex-col gap-5">
            <Field label="Monto pagado" hint="Se registrará como un gasto de este mes.">
              <AmountInput value={montoPago} onChange={(e) => setMontoPago(e.target.value)} moneda={fijoPorPagar.Moneda} autoFocus />
            </Field>
            {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
            <button type="submit" disabled={guardando} className="btn-primary h-12 w-full">
              {guardando ? <><Spinner /> Registrando…</> : 'Marcar como pagado'}
            </button>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
