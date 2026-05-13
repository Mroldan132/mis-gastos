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
        // Hacemos 3 llamadas en paralelo: Dashboard, Ingresos y Metas
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

  // --- CÁLCULOS MULTIMONEDA Y METAS ---
  const obtenerTotalAhorro = () => {
    if (!data || !data.DesgloseCategorias) return 0;
    const itemAhorro = data.DesgloseCategorias.find(c => c.Categoria === "Ahorro");
    return itemAhorro ? itemAhorro.Total : 0;
  };

  const totalAhorrado = obtenerTotalAhorro();
  const gastosReales = data?.Resumen?.Gastos ? data.Resumen.Gastos - totalAhorrado : 0;
  const sobraDinero = data?.Resumen?.Balance >= 0;

  // --- CONFIGURACIONES DE GRÁFICOS ---
  const getPieGastosOptions = () => {
    if (!data || !data.DesgloseCategorias) return {};
    // Filtramos para que la categoría "Ahorro" no salga en la dona de gastos reales
    const categoriasReales = data.DesgloseCategorias.filter(c => c.Categoria !== "Ahorro");
    
    return {
      tooltip: { trigger: 'item', backgroundColor: '#1E293B', textStyle: { color: '#FFF' }, formatter: '{b}: S/ {c}' },
      legend: { orient: 'horizontal', bottom: '0', textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 10 },
      series: [{
        name: 'Gastos Reales', type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
        itemStyle: { borderRadius: 8, borderColor: '#0F172A', borderWidth: 2 },
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
      xAxis: { type: 'category', data: categoriasReales.map(c => c.Categoria), axisLabel: { color: '#94a3b8', rotate: 35, fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#334155', type: 'dashed' } } },
      series: [{ data: categoriasReales.map(c => ({ value: c.Total, itemStyle: { color: '#ef4444' } })), type: 'bar', label: { show: true, position: 'top', color: '#fff', fontSize: 10, formatter: 'S/ {c}' } }]
    };
  };

  const getPieIngresosOptions = () => {
    return {
      tooltip: { trigger: 'item', formatter: '{b}: S/ {c}' },
      legend: { orient: 'horizontal', bottom: '0', textStyle: { color: '#94a3b8', fontSize: 10 } },
      series: [{
        type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
        itemStyle: { borderRadius: 8, borderColor: '#0F172A', borderWidth: 2 },
        label: { show: false },
        data: ingresosAgrupados
      }]
    };
  };

  const getBalanceOptions = () => {
    if (!data || !data.Resumen) return {};
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: { type: 'category', data: ['INGRESOS', 'GASTOS REALES'], axisLabel: { color: '#94a3b8', fontWeight: 'bold' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#334155', type: 'dashed' } } },
      series: [{
        data: [
          { value: data.Resumen.Ingresos, itemStyle: { color: '#3b82f6' } }, 
          { value: gastosReales, itemStyle: { color: '#ef4444' } }
        ],
        type: 'bar', barWidth: '50%', label: { show: true, position: 'top', color: '#fff', fontWeight: 'bold', formatter: 'S/ {c}' }
      }]
    };
  };

  const renderizarGrafico = () => {
    const props = { style: { height: '350px', width: '100%' }, notMerge: true };
    if (vistaGrafico === 'dona-gastos') return data.DesgloseCategorias?.length > 0 ? <ReactECharts option={getPieGastosOptions()} {...props} /> : <div className="h-full flex items-center justify-center text-gray-500">Sin datos.</div>;
    if (vistaGrafico === 'barras-gastos') return data.DesgloseCategorias?.length > 0 ? <ReactECharts option={getBarGastosOptions()} {...props} /> : <div className="h-full flex items-center justify-center text-gray-500">Sin datos.</div>;
    if (vistaGrafico === 'ingresos') return ingresosAgrupados?.length > 0 ? <ReactECharts option={getPieIngresosOptions()} {...props} /> : <div className="h-full flex items-center justify-center text-gray-500">Sin datos.</div>;
    if (vistaGrafico === 'balance') return <ReactECharts option={getBalanceOptions()} {...props} />;
  };

  return (
    <Layout>
      <header className="mb-6 flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold uppercase text-white">Dashboard</h1>
        <div className="flex gap-2">
          <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="flex-1 bg-slate-800 border-2 border-brillo-primario text-white p-2 font-bold outline-none">
            <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option>
            <option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option>
            <option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option>
            <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
          </select>
          <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="w-24 bg-slate-800 border-2 border-brillo-primario text-white p-2 font-bold outline-none">
            <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
          </select>
        </div>
      </header>

      {loading ? (
        <div className="text-center text-brillo-primario font-black py-20 animate-pulse">ANALIZANDO FINANZAS...</div>
      ) : !data ? (
        <div className="text-center text-gray-500 py-20 border-2 border-dashed border-gray-700">Sin datos registrados en este periodo.</div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* 4 TARJETAS DE RESUMEN */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-slate-900 border-2 border-blue-500 p-4 shadow-[4px_4px_0px_0px_rgba(59,130,246,1)]">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Ingresos (PEN)</p>
              <p className="text-2xl font-black text-white">S/ {data.Resumen.Ingresos.toFixed(2)}</p>
            </div>
            
            <div className="bg-slate-900 border-2 border-red-500 p-4 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Gastos Reales</p>
              <p className="text-2xl font-black text-white">S/ {gastosReales.toFixed(2)}</p>
            </div>

            <div className="bg-slate-900 border-2 border-brillo-primario p-4 shadow-[4px_4px_0px_0px_rgba(139,92,246,1)]">
              <p className="text-[10px] text-brillo-primario font-bold uppercase">Ahorro Mes</p>
              <p className="text-2xl font-black text-white">S/ {totalAhorrado.toFixed(2)}</p>
            </div>

            <div className={`p-4 border-2 shadow-[4px_4px_0px_0px] ${sobraDinero ? 'bg-green-500/10 border-green-500 shadow-green-500' : 'bg-red-500/10 border-red-500 shadow-red-500'}`}>
              <p className="text-[10px] text-white/70 font-bold uppercase">Disponible Hoy</p>
              <p className="text-2xl font-black text-white">S/ {data.Resumen.Balance.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* VISUALIZADOR DE GRÁFICOS */}
            <div className="xl:col-span-2 bg-slate-900 border-2 border-gray-700 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-wrap gap-1 mb-6 bg-slate-800 p-1 border border-gray-700">
                <button onClick={() => setVistaGrafico('dona-gastos')} className={`flex-1 py-2 text-[10px] font-black uppercase transition-colors ${vistaGrafico === 'dona-gastos' ? 'bg-brillo-primario text-white' : 'text-gray-500 hover:text-white'}`}>Dona</button>
                <button onClick={() => setVistaGrafico('barras-gastos')} className={`flex-1 py-2 text-[10px] font-black uppercase transition-colors ${vistaGrafico === 'barras-gastos' ? 'bg-brillo-primario text-white' : 'text-gray-500 hover:text-white'}`}>Barras</button>
                <button onClick={() => setVistaGrafico('ingresos')} className={`flex-1 py-2 text-[10px] font-black uppercase transition-colors ${vistaGrafico === 'ingresos' ? 'bg-brillo-primario text-white' : 'text-gray-500 hover:text-white'}`}>Ingresos</button>
                <button onClick={() => setVistaGrafico('balance')} className={`flex-1 py-2 text-[10px] font-black uppercase transition-colors ${vistaGrafico === 'balance' ? 'bg-brillo-primario text-white' : 'text-gray-500 hover:text-white'}`}>Balance</button>
              </div>
              
              <div className="w-full overflow-hidden">
                {renderizarGrafico()}
              </div>
            </div>

            {/* ESTADO DE METAS DINÁMICO */}
            <div className="bg-slate-900 border-2 border-white p-5 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex flex-col gap-4">
              <h3 className="text-lg font-black uppercase italic border-b-2 border-gray-800 pb-2 flex justify-between items-center">
                <span>Estado de Metas</span>
                <span className="text-xl">🎯</span>
              </h3>
              
              {metasActivas.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">No hay metas activas por el momento.</p>
              ) : (
                metasActivas.map(meta => {
                  const progreso = meta.MontoObjetivo > 0 ? (meta.MontoActual / meta.MontoObjetivo) * 100 : 0;
                  return (
                    <div key={meta.MetaId} className="flex flex-col gap-2 mb-2">
                      <div className="flex justify-between text-xs font-bold uppercase">
                        <span className="truncate pr-2">{meta.Icono} {meta.Nombre}</span>
                        <span className="text-brillo-primario">{progreso.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 border-2 border-gray-700 overflow-hidden relative">
                        <div className="h-full bg-brillo-primario transition-all duration-1000" style={{ width: `${Math.min(progreso, 100)}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}

              <button 
                onClick={() => navigate('/metas')}
                className="mt-auto w-full py-3 bg-slate-800 text-white text-xs font-black uppercase hover:bg-white hover:text-slate-900 transition-colors border-2 border-transparent hover:border-slate-900 active:translate-y-1"
              >
                GESTIONAR MIS METAS
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}