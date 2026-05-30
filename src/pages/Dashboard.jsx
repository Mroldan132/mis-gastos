import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import Layout from '../components/Layout';
import { apiDashboard, apiIngresos, apiMetas } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [ingresosAgrupados, setIngresosAgrupados] = useState([]);
  const [metasActivas, setMetasActivas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [vistaGrafico, setVistaGrafico] = useState('dona-gastos'); 

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const periodo = `${filtroAnio}-${filtroMes}`; 

      try {
        const [resDash, resIng, resMetas] = await Promise.all([
          apiDashboard.get(`/dashboard?userId=${userId}&mes=${periodo}`).catch(() => ({ data: { Success: false } })),
          apiIngresos.get(`/ingresos?userId=${userId}&mes=${periodo}`).catch(() => ({ data: { Success: false } })),
          apiMetas.get(`/metas?userId=${userId}`).catch(() => ({ data: { Success: false } }))
        ]);

        if (resDash.data.Success) setData(resDash.data);
        else setData(null);

        if (resIng.data.Success && resIng.data.Ingresos) {
          const agrupados = resIng.data.Ingresos.reduce((acc, curr) => {
            const desc = curr.Descripcion || 'Otros';
            acc[desc] = (acc[desc] || 0) + curr.Monto;
            return acc;
          }, {});
          const dataIngresosFormat = Object.keys(agrupados).map(k => ({ name: k, value: agrupados[k] }));
          setIngresosAgrupados(dataIngresosFormat);
        } else {
          setIngresosAgrupados([]);
        }

        if (resMetas.data.Success && resMetas.data.Metas) {
          const activas = resMetas.data.Metas.filter(m => m.Estado !== "Completada").slice(0, 3);
          setMetasActivas(activas);
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
  }, [filtroAnio, filtroMes]);

  const obtenerTotalAhorro = () => {
    if (!data || !data.DesgloseCategorias) return 0;
    const itemAhorro = data.DesgloseCategorias.find(c => c.Categoria === "Ahorro");
    return itemAhorro ? itemAhorro.Total : 0;
  };

  const totalAhorrado = obtenerTotalAhorro();
  const gastosReales = data?.Resumen?.Gastos ? data.Resumen.Gastos - totalAhorrado : 0;
  const sobraDinero = data?.Resumen?.Balance >= 0;

  // Opciones ECharts adaptadas al nuevo tema
  const getPieGastosOptions = () => {
    if (!data || !data.DesgloseCategorias) return {};
    const categoriasReales = data.DesgloseCategorias.filter(c => c.Categoria !== "Ahorro");
    return {
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f8fafc' }, formatter: '{b}: S/ {c}' },
      legend: { orient: 'horizontal', bottom: '0', textStyle: { color: '#94a3b8', fontSize: 11 }, itemWidth: 12 },
      series: [{
        name: 'Gastos Reales', type: 'pie', radius: ['45%', '70%'], center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
        label: { show: false },
        data: categoriasReales.map(c => ({ value: c.Total, name: c.Categoria }))
      }]
    };
  };

  const getBarGastosOptions = () => {
    if (!data || !data.DesgloseCategorias) return {};
    const categoriasReales = data.DesgloseCategorias.filter(c => c.Categoria !== "Ahorro");
    return {
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', data: categoriasReales.map(c => c.Categoria), axisLabel: { color: '#94a3b8', rotate: 30, fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } } },
      series: [{ data: categoriasReales.map(c => ({ value: c.Total, itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] } })), type: 'bar', label: { show: true, position: 'top', color: '#f8fafc', fontSize: 11, formatter: 'S/ {c}' } }]
    };
  };

  const getPieIngresosOptions = () => {
    return {
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f8fafc' }, formatter: '{b}: S/ {c}' },
      legend: { orient: 'horizontal', bottom: '0', textStyle: { color: '#94a3b8', fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
        label: { show: false },
        data: ingresosAgrupados
      }]
    };
  };

  const getBalanceOptions = () => {
    if (!data || !data.Resumen) return {};
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f8fafc' } },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: { type: 'category', data: ['Ingresos', 'Gastos Reales'], axisLabel: { color: '#94a3b8', fontWeight: '500' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } } },
      series: [{
        data: [
          { value: data.Resumen.Ingresos, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } }, 
          { value: gastosReales, itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] } }
        ],
        type: 'bar', barWidth: '40%', label: { show: true, position: 'top', color: '#f8fafc', fontWeight: '500', formatter: 'S/ {c}' }
      }]
    };
  };

  const renderizarGrafico = () => {
    const props = { style: { height: '320px', width: '100%' }, notMerge: true };
    if (vistaGrafico === 'dona-gastos') return data.DesgloseCategorias?.length > 0 ? <ReactECharts option={getPieGastosOptions()} {...props} /> : <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sin datos suficientes.</div>;
    if (vistaGrafico === 'barras-gastos') return data.DesgloseCategorias?.length > 0 ? <ReactECharts option={getBarGastosOptions()} {...props} /> : <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sin datos suficientes.</div>;
    if (vistaGrafico === 'ingresos') return ingresosAgrupados?.length > 0 ? <ReactECharts option={getPieIngresosOptions()} {...props} /> : <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sin datos suficientes.</div>;
    if (vistaGrafico === 'balance') return <ReactECharts option={getBalanceOptions()} {...props} />;
  };

  return (
    <Layout>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <div className="flex gap-3">
          <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="bg-slate-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer">
            <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option><option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option><option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
          </select>
          <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="bg-slate-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer">
            <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
          </select>
        </div>
      </header>

      {loading ? (
        <div className="text-center text-indigo-400 font-medium py-20 animate-pulse">Analizando finanzas...</div>
      ) : !data ? (
        <div className="text-center text-gray-500 py-20 border border-dashed border-gray-700 rounded-2xl">Sin datos registrados en este periodo.</div>
      ) : (
        <div className="flex flex-col gap-8">
          
          {/* TARJETAS DE RESUMEN (ESTILO WIDGETS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="bg-slate-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Ingresos (PEN)</p>
              <p className="text-3xl font-bold text-white">S/ {data.Resumen.Ingresos.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            
            <div className="bg-slate-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Gastos Reales</p>
              <p className="text-3xl font-bold text-white">S/ {gastosReales.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>

            <div className="bg-slate-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Ahorro Mensual</p>
              <p className="text-3xl font-bold text-white">S/ {totalAhorrado.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>

            <div className={`p-5 rounded-2xl shadow-lg relative overflow-hidden border ${sobraDinero ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${sobraDinero ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Disponible Hoy</p>
              <p className={`text-3xl font-bold ${sobraDinero ? 'text-emerald-400' : 'text-rose-400'}`}>S/ {data.Resumen.Balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* VISUALIZADOR DE GRÁFICOS */}
            <div className="xl:col-span-2 bg-slate-900 border border-gray-800 p-6 rounded-2xl shadow-lg flex flex-col">
              
              {/* Segmented Control (Pestañas suaves) */}
              <div className="flex bg-slate-950/50 p-1 border border-gray-800 rounded-lg w-full md:w-max mb-6">
                <button onClick={() => setVistaGrafico('dona-gastos')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${vistaGrafico === 'dona-gastos' ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Dona</button>
                <button onClick={() => setVistaGrafico('barras-gastos')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${vistaGrafico === 'barras-gastos' ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Barras</button>
                <button onClick={() => setVistaGrafico('ingresos')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${vistaGrafico === 'ingresos' ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Ingresos</button>
                <button onClick={() => setVistaGrafico('balance')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${vistaGrafico === 'balance' ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Balance</button>
              </div>
              
              <div className="w-full flex-1 overflow-hidden">
                {renderizarGrafico()}
              </div>
            </div>

            {/* ESTADO DE METAS DINÁMICO */}
            <div className="bg-slate-900 border border-gray-800 p-6 rounded-2xl shadow-lg flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-5">
                <h3 className="text-base font-semibold text-white">Progreso de Metas</h3>
                <span className="text-xl">🎯</span>
              </div>
              
              <div className="flex-1 flex flex-col gap-5">
                {metasActivas.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">No hay metas activas por el momento.</p>
                ) : (
                  metasActivas.map(meta => {
                    const progreso = meta.MontoObjetivo > 0 ? (meta.MontoActual / meta.MontoObjetivo) * 100 : 0;
                    return (
                      <div key={meta.MetaId} className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs font-medium text-gray-300">
                          <span className="truncate pr-2">{meta.Icono} {meta.Nombre}</span>
                          <span className="text-indigo-400 font-semibold">{progreso.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-gray-800">
                          <div className="h-full bg-indigo-500 transition-all duration-1000 rounded-full" style={{ width: `${Math.min(progreso, 100)}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button 
                onClick={() => navigate('/metas')}
                className="mt-6 w-full py-2.5 bg-slate-800/50 text-gray-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all rounded-lg border border-gray-700"
              >
                Ver Todas las Metas
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}