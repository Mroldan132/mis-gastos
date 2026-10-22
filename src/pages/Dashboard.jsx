import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiDashboard, apiIngresos, apiMetas } from '../services/api';
import { Icon, PageHeader, PeriodPicker, Segmented, ProgressBar, EmptyState } from '../components/ui';
import { formatMonto, periodoActual, periodoTexto } from '../lib/format';

// Paleta categórica validada (orden fijo, contraste y daltonismo) sobre la superficie #141417
const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const OTRAS = '#52525B';
const INK = { primary: '#F4F4F5', secondary: '#A1A1AA', muted: '#71717A', grid: 'rgba(255,255,255,0.06)', surface: '#141417' };

const tooltipBase = {
  backgroundColor: '#1C1C20',
  borderColor: 'rgba(255,255,255,0.12)',
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: INK.primary, fontFamily: 'Geist, system-ui, sans-serif', fontSize: 12 },
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [ingresosAgrupados, setIngresosAgrupados] = useState([]);
  const [metasActivas, setMetasActivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(periodoActual);
  const [vistaGrafico, setVistaGrafico] = useState('barras-gastos');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const mes = periodoTexto(periodo);

      try {
        const [resDash, resIng, resMetas] = await Promise.all([
          apiDashboard.get(`/dashboard?userId=${userId}&mes=${mes}`).catch(() => ({ data: { Success: false } })),
          apiIngresos.get(`/ingresos?userId=${userId}&mes=${mes}`).catch(() => ({ data: { Success: false } })),
          apiMetas.get(`/metas?userId=${userId}`).catch(() => ({ data: { Success: false } }))
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

        if (resMetas.data.Success && resMetas.data.Metas) {
          setMetasActivas(resMetas.data.Metas.filter(m => m.Estado !== "Completada").slice(0, 3));
        } else {
          setMetasActivas([]);
        }
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
  const porcentajeGastado = ingresos > 0 ? Math.round(((gastosReales + totalAhorrado) / ingresos) * 100) : null;

  const categorias = useMemo(
    () => agruparEnOtras((data?.DesgloseCategorias ?? []).filter(c => c.Categoria !== "Ahorro").map(c => ({ name: c.Categoria, value: c.Total }))),
    [data]
  );
  const ingresosSerie = useMemo(() => agruparEnOtras(ingresosAgrupados), [ingresosAgrupados]);

  // --- OPCIONES DE GRÁFICOS ---
  const opcionesBarras = () => {
    const filas = [...categorias].reverse(); // ECharts dibuja de abajo hacia arriba
    return {
      textStyle: { fontFamily: 'Geist, system-ui, sans-serif' },
      grid: { left: 4, right: 88, top: 4, bottom: 4, containLabel: true },
      tooltip: { ...tooltipBase, trigger: 'item', formatter: (p) => `${p.name}<br/><b>${formatMonto(p.value)}</b>` },
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
    textStyle: { fontFamily: 'Geist, system-ui, sans-serif' },
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

  const opcionesBalance = () => ({
    textStyle: { fontFamily: 'Geist, system-ui, sans-serif' },
    tooltip: { ...tooltipBase, trigger: 'item', formatter: (p) => `${p.name}<br/><b>${formatMonto(p.value)}</b>` },
    grid: { left: 4, right: 4, top: 36, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category', data: ['Ingresos', 'Gastos reales', 'Ahorro'],
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }, axisTick: { show: false },
      axisLabel: { color: INK.secondary, fontSize: 12, margin: 12 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: INK.muted, fontSize: 11, formatter: (v) => (v >= 1000 ? `${v / 1000}k` : v) },
      splitLine: { lineStyle: { color: INK.grid } },
    },
    series: [{
      type: 'bar', barMaxWidth: 56,
      data: [
        { value: ingresos, itemStyle: { color: SERIES[2], borderRadius: [4, 4, 0, 0] } },
        { value: gastosReales, itemStyle: { color: SERIES[1], borderRadius: [4, 4, 0, 0] } },
        { value: totalAhorrado, itemStyle: { color: SERIES[0], borderRadius: [4, 4, 0, 0] } },
      ],
      label: { show: true, position: 'top', color: INK.primary, fontSize: 12, formatter: (p) => formatMonto(p.value) },
    }],
  });

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
    return <ReactECharts option={opcionesBalance()} style={{ height: 320, width: '100%' }} {...props} />;
  };

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
                {porcentajeGastado != null && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                    <Icon name={sobraDinero ? 'arrowUp' : 'arrowDown'} size={15} className={sobraDinero ? 'text-positive' : 'text-negative'} />
                    Usaste el <span className="text-ink num">{porcentajeGastado}%</span> de tus ingresos
                  </p>
                )}
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
            <section className="card min-w-0 p-5 md:p-6 lg:col-span-2 animate-fade-up" style={{ animationDelay: '60ms' }}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[15px] font-medium text-ink">¿A dónde fue tu dinero?</h2>
                <Segmented
                  value={vistaGrafico}
                  onChange={setVistaGrafico}
                  options={[
                    { value: 'barras-gastos', label: 'Categorías' },
                    { value: 'dona-gastos', label: 'Reparto' },
                    { value: 'ingresos', label: 'Ingresos' },
                    { value: 'balance', label: 'Balance' },
                  ]}
                />
              </div>
              <div className="w-full overflow-hidden">{renderizarGrafico()}</div>
            </section>

            {/* --- METAS --- */}
            <section className="card flex flex-col p-5 md:p-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-ink">Metas en curso</h2>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Icon name="target" size={16} />
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-6">
                {metasActivas.length === 0 ? (
                  <EmptyState icon="target" title="Sin metas activas" description="Crea una meta y empieza a separar tu ahorro." />
                ) : (
                  metasActivas.map(meta => {
                    const progreso = meta.MontoObjetivo > 0 ? (meta.MontoActual / meta.MontoObjetivo) * 100 : 0;
                    return (
                      <div key={meta.MetaId}>
                        <div className="mb-2.5 flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2.5 text-sm text-ink">
                            <span className="text-base">{meta.Icono}</span>
                            <span className="truncate">{meta.Nombre}</span>
                          </span>
                          <span className="text-sm text-muted num">{progreso.toFixed(0)}%</span>
                        </div>
                        <ProgressBar value={progreso} />
                        <p className="mt-2 text-xs text-faint num">
                          {formatMonto(meta.MontoActual)} de {formatMonto(meta.MontoObjetivo)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <button onClick={() => navigate('/metas')} className="btn-secondary mt-6 w-full">
                Ver todas las metas <Icon name="chevronRight" size={16} />
              </button>
            </section>
          </div>
        </div>
      )}
    </Layout>
  );
}
