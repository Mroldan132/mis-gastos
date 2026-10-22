import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiDashboard, apiIngresos, apiMetas, apiPlan, apiCuotas } from '../services/api';
import { Icon, PageHeader, PeriodPicker, Segmented, ProgressBar, EmptyState } from '../components/ui';
import { formatMonto, formatFecha, periodoActual, periodoTexto, nombreMes, nombreMesCorto } from '../lib/format';

// Paleta categórica validada (orden fijo, contraste y daltonismo) sobre la superficie #141417
const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const OTRAS = '#52525B';
const INK = { primary: '#F4F4F5', secondary: '#A1A1AA', muted: '#71717A', grid: 'rgba(255,255,255,0.06)', surface: '#141417' };
const FUENTE = { fontFamily: 'Geist, system-ui, sans-serif' };

const tooltipBase = {
  backgroundColor: '#1C1C20',
  borderColor: 'rgba(255,255,255,0.12)',
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: INK.primary, ...FUENTE, fontSize: 12 },
  extraCssText: 'border-radius:12px; box-shadow:0 12px 32px rgba(0,0,0,.45);',
};

// Máximo 8 colores: a partir del noveno se agrupa en "Otras"
const agruparEnOtras = (items) => {
  const ordenados = [...items].sort((a, b) => b.value - a.value);
  if (ordenados.length <= SERIES.length) return ordenados.map((it, i) => ({ ...it, color: SERIES[i] }));
  const top = ordenados.slice(0, SERIES.length - 1).map((it, i) => ({ ...it, color: SERIES[i] }));
  const resto = ordenados.slice(SERIES.length - 1).reduce((s, it) => s + it.value, 0);
  return [...top, { name: 'Otras', value: resto, color: OTRAS }];
};

const variacionTexto = (v) => (v == null ? 'nuevo este mes' : `${v > 0 ? '+' : ''}${Math.round(v)}% vs. mes anterior`);

function Tarjeta({ titulo, icono, accion, children, delay = 0 }) {
  return (
    <section className="card flex flex-col p-5 md:p-6 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium text-ink">{titulo}</h2>
        {accion ?? <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent"><Icon name={icono} size={16} /></span>}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [ingresosAgrupados, setIngresosAgrupados] = useState([]);
  const [metasActivas, setMetasActivas] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [fijos, setFijos] = useState(null);
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(periodoActual);
  const [vistaGrafico, setVistaGrafico] = useState('barras-gastos');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      const mes = periodoTexto(periodo);
      const fallo = () => ({ data: { Success: false } });

      try {
        const [resDash, resIng, resMetas, resPres, resFijos, resCuotas] = await Promise.all([
          apiDashboard.get(`/dashboard?mes=${mes}`).catch(fallo),
          apiIngresos.get(`/ingresos?mes=${mes}`).catch(fallo),
          apiMetas.get(`/metas`).catch(fallo),
          apiPlan.get(`/presupuestos?mes=${mes}`).catch(fallo),
          apiPlan.get(`/fijos?mes=${mes}`).catch(fallo),
          apiCuotas.get(`/cuotas`).catch(fallo),
        ]);

        setData(resDash.data.Success ? resDash.data : null);

        if (resIng.data.Success && resIng.data.Ingresos) {
          const agrupados = resIng.data.Ingresos.reduce((acc, curr) => {
            const desc = curr.Descripcion || 'Otros';
            acc[desc] = (acc[desc] || 0) + curr.Monto;
            return acc;
          }, {});
          setIngresosAgrupados(Object.keys(agrupados).map(k => ({ name: k, value: agrupados[k] })));
        } else {
          setIngresosAgrupados([]);
        }

        setMetasActivas(resMetas.data.Success ? (resMetas.data.Metas || []).filter(m => m.Estado !== "Completada").slice(0, 3) : []);
        setPresupuestos(resPres.data.Success ? resPres.data.Presupuestos : []);
        setFijos(resFijos.data.Success ? resFijos.data : null);
        setCuotas(resCuotas.data.Success ? resCuotas.data.Cuotas : []);
      } catch (error) {
        console.error("Error cargando dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [periodo]);

  const totalAhorrado = data?.DesgloseCategorias?.find(c => c.Categoria === "Ahorro")?.Total ?? 0;
  const ingresos = data?.Resumen?.Ingresos ?? 0;
  const gastosReales = data?.Resumen?.Gastos ? data.Resumen.Gastos - totalAhorrado : 0;
  const balance = data?.Resumen?.Balance ?? 0;
  const sobraDinero = balance >= 0;
  const fijosPendientes = fijos?.TotalPendiente ?? 0;
  const disponibleReal = balance - fijosPendientes;
  const gastosMesAnterior = data?.Comparativa?.GastosMesAnterior ?? 0;
  const variacionMes = gastosMesAnterior > 0 ? ((gastosReales - gastosMesAnterior) / gastosMesAnterior) * 100 : null;

  const categorias = useMemo(
    () => agruparEnOtras((data?.DesgloseCategorias ?? []).filter(c => c.Categoria !== "Ahorro").map(c => ({ name: c.Categoria, value: c.Total }))),
    [data]
  );
  const variacionPorCategoria = useMemo(
    () => Object.fromEntries((data?.Comparativa?.Categorias ?? []).map(c => [c.Categoria, c.Variacion])),
    [data]
  );
  const ingresosSerie = useMemo(() => agruparEnOtras(ingresosAgrupados), [ingresosAgrupados]);

  // Próximos 7 días: pagos fijos sin pagar y cuotas pendientes (incluye vencidos)
  const proximos = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy); limite.setDate(limite.getDate() + 7);
    const enRango = (f) => new Date(`${f.slice(0, 10)}T00:00:00`) <= limite;
    const items = [
      ...(fijos?.Fijos ?? []).filter(f => f.Activo && !f.Pagado && enRango(f.Vencimiento))
        .map(f => ({ id: f.FijoId, nombre: f.Nombre, monto: f.Monto, moneda: f.Moneda, fecha: f.Vencimiento, tipo: 'Pago fijo', ir: '/plan?tab=fijos' })),
      ...cuotas.filter(c => c.Estado !== 'Pagado' && enRango(c.FechaOperacion))
        .map(c => ({ id: c.Id, nombre: c.Comercio, monto: c.Monto, moneda: 'PEN', fecha: c.FechaOperacion.slice(0, 10), tipo: 'Cuota', ir: '/cuotas' })),
    ];
    return items.sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5).map(i => ({ ...i, vencido: new Date(`${i.fecha}T00:00:00`) < hoy }));
  }, [fijos, cuotas]);

  // --- OPCIONES DE GRÁFICOS ---
  const opcionesBarras = () => {
    const filas = [...categorias].reverse(); // ECharts dibuja de abajo hacia arriba
    return {
      textStyle: FUENTE,
      grid: { left: 4, right: 88, top: 4, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase, trigger: 'item',
        formatter: (p) => `${p.name}<br/><b>${formatMonto(p.value)}</b>${p.name !== 'Otras' ? `<br/><span style="color:${INK.secondary}">${variacionTexto(variacionPorCategoria[p.name])}</span>` : ''}`,
      },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: filas.map(c => c.name),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: INK.secondary, fontSize: 12, width: 110, overflow: 'truncate', margin: 14 },
      },
      series: [{
        type: 'bar',
        barMaxWidth: 18,
        barCategoryGap: '38%',
        data: filas.map(c => ({ value: c.value, itemStyle: { color: '#D4F75A', borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: 'right', distance: 10, color: INK.primary, fontSize: 12, formatter: (p) => formatMonto(p.value) },
        emphasis: { itemStyle: { color: '#E2FA8A' } },
      }],
    };
  };

  const opcionesDona = (serie) => ({
    textStyle: FUENTE,
    tooltip: { ...tooltipBase, trigger: 'item', formatter: (p) => `${p.marker} ${p.name}<br/><b>${formatMonto(p.value)}</b> · ${p.percent}%` },
    legend: {
      type: 'scroll', bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 16,
      textStyle: { color: INK.secondary, fontSize: 12 },
      pageIconColor: INK.secondary, pageIconInactiveColor: INK.muted, pageTextStyle: { color: INK.muted },
    },
    series: [{
      type: 'pie',
      radius: ['54%', '76%'],
      center: ['50%', '44%'],
      padAngle: 1,
      itemStyle: { borderRadius: 4, borderColor: INK.surface, borderWidth: 2 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 4, label: { show: false } },
      data: serie.map(s => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
    }],
  });

  // Ingresos vs. gastos de los últimos 6 meses (dos series, una sola escala)
  const opcionesTendencia = () => {
    const t = data?.Tendencia ?? [];
    return {
      textStyle: FUENTE,
      tooltip: {
        ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.03)' } },
        formatter: (ps) => `${nombreMes(t[ps[0].dataIndex].Mes)}<br/>${ps.map(p => `${p.marker} ${p.seriesName}: <b>${formatMonto(p.value)}</b>`).join('<br/>')}`,
      },
      legend: { top: 0, right: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 16, textStyle: { color: INK.secondary, fontSize: 12 } },
      grid: { left: 4, right: 4, top: 40, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category', data: t.map(x => nombreMesCorto(x.Mes)),
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }, axisTick: { show: false },
        axisLabel: { color: INK.secondary, fontSize: 12, margin: 12 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: INK.muted, fontSize: 11, formatter: (v) => (v >= 1000 ? `${v / 1000}k` : v) },
        splitLine: { lineStyle: { color: INK.grid } },
      },
      series: [
        { name: 'Ingresos', type: 'bar', barMaxWidth: 16, barGap: '15%', itemStyle: { color: SERIES[2], borderRadius: [4, 4, 0, 0] }, data: t.map(x => x.Ingresos) },
        { name: 'Gastos', type: 'bar', barMaxWidth: 16, itemStyle: { color: SERIES[1], borderRadius: [4, 4, 0, 0] }, data: t.map(x => x.Gastos) },
      ],
    };
  };

  const renderizarGrafico = () => {
    const sinDatos = <EmptyState icon="dashboard" title="Sin datos suficientes" description="Registra movimientos en este periodo para ver el gráfico." />;
    const props = { notMerge: true, opts: { renderer: 'svg' } };

    if (vistaGrafico === 'barras-gastos') {
      if (!categorias.length) return sinDatos;
      return <ReactECharts option={opcionesBarras()} style={{ height: Math.max(220, categorias.length * 44), width: '100%' }} {...props} />;
    }
    if (vistaGrafico === 'dona-gastos') {
      return categorias.length ? <ReactECharts option={opcionesDona(categorias)} style={{ height: 340, width: '100%' }} {...props} /> : sinDatos;
    }
    if (vistaGrafico === 'ingresos') {
      return ingresosSerie.length ? <ReactECharts option={opcionesDona(ingresosSerie)} style={{ height: 340, width: '100%' }} {...props} /> : sinDatos;
    }
    return <ReactECharts option={opcionesTendencia()} style={{ height: 320, width: '100%' }} {...props} />;
  };

  const presupuestosTop = [...presupuestos].sort((a, b) => b.Porcentaje - a.Porcentaje).slice(0, 4);

  return (
    <Layout>
      <PageHeader
        eyebrow="Panel general"
        title="Resumen"
        actions={<PeriodPicker periodo={periodo} onChange={setPeriodo} />}
      />

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="skeleton h-56 rounded-3xl" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="skeleton h-80 rounded-2xl lg:col-span-2" />
            <div className="skeleton h-80 rounded-2xl" />
          </div>
        </div>
      ) : !data ? (
        <div className="card">
          <EmptyState icon="inbox" title="Sin movimientos" description="No hay datos registrados en este periodo. Prueba con otro mes." />
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* --- GASTOS POR REVISAR --- */}
          {data.PorRevisar > 0 && (
            <Link to="/gastos?vista=revisar" className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/[0.06] p-4 animate-fade-up">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-canvas"><Icon name="sparkle" size={18} /></span>
              <p className="min-w-0 flex-1 text-sm text-ink">
                <span className="font-medium">{data.PorRevisar} {data.PorRevisar === 1 ? 'gasto leído' : 'gastos leídos'} por la IA</span>
                <span className="block text-xs text-muted">Revísalos para que tus totales sean exactos.</span>
              </p>
              <Icon name="chevronRight" size={18} className="text-muted" />
            </Link>
          )}

          {/* --- HÉROE: DISPONIBLE --- */}
          <section className="card relative overflow-hidden rounded-3xl p-6 md:p-8 animate-fade-up">
            <div className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl ${sobraDinero ? 'bg-accent/[0.07]' : 'bg-negative/[0.08]'}`} />

            <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="eyebrow flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${sobraDinero ? 'bg-accent' : 'bg-negative'}`} />
                  Disponible este mes
                </p>
                <p className={`mt-4 text-5xl font-medium tracking-tighter num md:text-6xl ${sobraDinero ? 'text-ink' : 'text-negative'}`}>
                  {formatMonto(balance)}
                </p>
                <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted">
                  {fijosPendientes > 0 && (
                    <Link to="/plan?tab=fijos" className="flex items-center gap-1.5 hover:text-ink">
                      <Icon name="calendar" size={15} className="text-faint" />
                      Después de pagos fijos: <span className={`num ${disponibleReal >= 0 ? 'text-ink' : 'text-negative'}`}>{formatMonto(disponibleReal)}</span>
                    </Link>
                  )}
                  {variacionMes != null && (
                    <p className="flex items-center gap-1.5">
                      <Icon name={variacionMes > 0 ? 'arrowUp' : 'arrowDown'} size={15} className={variacionMes > 0 ? 'text-negative' : 'text-positive'} />
                      Gastas <span className="text-ink num">{Math.abs(Math.round(variacionMes))}% {variacionMes > 0 ? 'más' : 'menos'}</span> que en {nombreMes(data.Comparativa.MesAnterior).split(' ')[0].toLowerCase()}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 xl:min-w-[480px]">
                {[
                  { label: 'Ingresos', value: ingresos, color: SERIES[2] },
                  { label: 'Gastos reales', value: gastosReales, color: SERIES[1] },
                  { label: 'Ahorro', value: totalAhorrado, color: SERIES[0] },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-3 bg-surface px-4 py-3.5 sm:block">
                    <p className="flex items-center gap-2 text-xs text-muted">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                      {item.label}
                    </p>
                    <p className="text-[15px] font-medium text-ink num sm:mt-2 sm:text-lg">{formatMonto(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            {/* --- GRÁFICOS --- */}
            <section className="card min-w-0 self-start p-5 md:p-6 lg:col-span-2 animate-fade-up" style={{ animationDelay: '60ms' }}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[15px] font-medium text-ink">¿A dónde fue tu dinero?</h2>
                <Segmented
                  value={vistaGrafico}
                  onChange={setVistaGrafico}
                  options={[
                    { value: 'barras-gastos', label: 'Categorías' },
                    { value: 'dona-gastos', label: 'Reparto' },
                    { value: 'tendencia', label: '6 meses' },
                    { value: 'ingresos', label: 'Ingresos' },
                  ]}
                />
              </div>
              <div className="w-full overflow-hidden">{renderizarGrafico()}</div>

              {/* Lo que más cambió frente al mes anterior */}
              {vistaGrafico === 'barras-gastos' && (data.Comparativa?.Categorias ?? []).some(c => c.Variacion != null && c.Anterior >= 20) && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="eyebrow mb-3">Frente a {nombreMes(data.Comparativa.MesAnterior).toLowerCase()}</p>
                  <div className="flex flex-wrap gap-2">
                    {data.Comparativa.Categorias
                      .filter(c => c.Variacion != null && c.Anterior >= 20)
                      .sort((a, b) => Math.abs(b.Actual - b.Anterior) - Math.abs(a.Actual - a.Anterior))
                      .slice(0, 4)
                      .map(c => (
                        <span key={c.Categoria} className={`badge ${c.Variacion > 0 ? 'border-negative/20 text-negative' : 'border-positive/20 text-positive'}`}>
                          <Icon name={c.Variacion > 0 ? 'arrowUp' : 'arrowDown'} size={12} />
                          {c.Categoria} <span className="num">{c.Variacion > 0 ? '+' : ''}{Math.round(c.Variacion)}%</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </section>

            <div className="flex flex-col gap-4">
              {/* --- PRÓXIMOS PAGOS --- */}
              <Tarjeta titulo="Próximos 7 días" icono="calendar" delay={100}>
                {proximos.length === 0 ? (
                  <p className="py-2 text-sm text-faint">No tienes pagos fijos ni cuotas por vencer esta semana.</p>
                ) : (
                  <ul className="flex flex-col gap-3.5">
                    {proximos.map(p => (
                      <li key={`${p.tipo}-${p.id}`}>
                        <Link to={p.ir} className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-ink">{p.nombre}</span>
                            <span className={`flex items-center gap-1 text-xs ${p.vencido ? 'text-negative' : 'text-faint'}`}>
                              {p.vencido && <Icon name="alert" size={12} />}
                              {p.tipo} · {p.vencido ? 'venció el ' : ''}{formatFecha(p.fecha).replace(/ \d{4}$/, '')}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-medium text-ink num">{formatMonto(p.monto, p.moneda)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Tarjeta>

              {/* --- PRESUPUESTOS --- */}
              <Tarjeta
                titulo="Presupuestos"
                delay={140}
                accion={<Link to="/plan" className="text-xs text-accent hover:underline">{presupuestos.length ? 'Ver todos' : 'Crear'}</Link>}
              >
                {presupuestosTop.length === 0 ? (
                  <p className="py-2 text-sm text-faint">Ponle tope a tus categorías y te avisamos cuando te acerques.</p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {presupuestosTop.map(p => {
                      const tono = p.Porcentaje > 100 ? 'negative' : p.Porcentaje >= 80 ? 'warning' : 'accent';
                      return (
                        <li key={p.Categoria}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-1.5 truncate text-ink">
                              {tono !== 'accent' && <Icon name="alert" size={13} className={tono === 'negative' ? 'text-negative' : 'text-warning'} />}
                              {p.Categoria}
                            </span>
                            <span className="shrink-0 text-muted num">{Math.round(p.Porcentaje)}%</span>
                          </div>
                          <ProgressBar value={p.Porcentaje} tone={tono} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Tarjeta>

              {/* --- METAS --- */}
              <Tarjeta titulo="Metas en curso" icono="target" delay={180}>
                <div className="flex flex-1 flex-col gap-5">
                  {metasActivas.length === 0 ? (
                    <p className="py-2 text-sm text-faint">Crea una meta y empieza a separar tu ahorro.</p>
                  ) : (
                    metasActivas.map(meta => {
                      const progreso = meta.MontoObjetivo > 0 ? (meta.MontoActual / meta.MontoObjetivo) * 100 : 0;
                      return (
                        <div key={meta.MetaId}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2.5 text-sm text-ink">
                              <span className="text-base">{meta.Icono}</span>
                              <span className="truncate">{meta.Nombre}</span>
                            </span>
                            <span className="text-sm text-muted num">{progreso.toFixed(0)}%</span>
                          </div>
                          <ProgressBar value={progreso} />
                        </div>
                      );
                    })
                  )}
                </div>
                <button onClick={() => navigate('/metas')} className="btn-secondary mt-5 w-full">
                  Ver metas <Icon name="chevronRight" size={16} />
                </button>
              </Tarjeta>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
