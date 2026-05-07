import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import Layout from '../components/Layout';
import { apiDashboard, apiIngresos } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [ingresosAgrupados, setIngresosAgrupados] = useState([]);
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
        const [resDash, resIng] = await Promise.all([
          apiDashboard.get(`/dashboard?userId=${userId}&mes=${periodo}`).catch(() => ({ data: { Success: false } })),
          apiIngresos.get(`/ingresos?userId=${userId}&mes=${periodo}`).catch(() => ({ data: { Success: false } }))
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
      } catch (error) {
        console.error("Error cargando dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [filtroAnio, filtroMes]);

  // --- CONFIGURACIONES DE ECHARTS CORREGIDAS ---

  const getPieGastosOptions = () => {
    if (!data || !data.DesgloseCategorias) return {};
    return {
      tooltip: { trigger: 'item', backgroundColor: '#1E293B', textStyle: { color: '#FFF' }, formatter: '{b}: S/ {c} ({d}%)' },
      // LEYENDA AGREGADA
      legend: { orient: 'vertical', left: 'left', top: 'center', textStyle: { color: '#cbd5e1', fontWeight: 'bold' } },
      series: [{
        name: 'Gastos', type: 'pie', 
        radius: ['40%', '70%'], 
        center: ['65%', '50%'], // Movido a la derecha para dar espacio a la leyenda
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#0F172A', borderWidth: 4 },
        label: { show: false },
        data: data.DesgloseCategorias.map(c => ({ value: c.Total, name: c.Categoria }))
      }]
    };
  };

  const getBarGastosOptions = () => {
    if (!data || !data.DesgloseCategorias) return {};
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1E293B', textStyle: { color: '#FFF' } },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: { type: 'category', data: data.DesgloseCategorias.map(c => c.Categoria), axisLabel: { color: '#94a3b8', interval: 0, rotate: 30, fontWeight: 'bold' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#334155', type: 'dashed' } } },
      series: [{ data: data.DesgloseCategorias.map(c => ({ value: c.Total, itemStyle: { color: '#ef4444' } })), type: 'bar', barWidth: '50%', label: { show: true, position: 'top', color: '#fff', formatter: 'S/ {c}' } }]
    };
  };

  const getPieIngresosOptions = () => {
    if (ingresosAgrupados.length === 0) return {};
    return {
      tooltip: { trigger: 'item', backgroundColor: '#1E293B', textStyle: { color: '#FFF' }, formatter: '{b}: S/ {c} ({d}%)' },
      // LEYENDA AGREGADA
      legend: { orient: 'vertical', left: 'left', top: 'center', textStyle: { color: '#cbd5e1', fontWeight: 'bold' } },
      series: [{
        name: 'Ingresos', type: 'pie', 
        radius: ['40%', '70%'], 
        center: ['65%', '50%'], // Movido a la derecha
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#0F172A', borderWidth: 4 },
        label: { show: false },
        data: ingresosAgrupados
      }]
    };
  };

  const getBalanceOptions = () => {
    if (!data || !data.Resumen) return {};
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1E293B', textStyle: { color: '#FFF' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['INGRESOS', 'GASTOS'], axisLabel: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: 'S/ {value}' }, splitLine: { lineStyle: { color: '#334155', type: 'dashed' } } },
      series: [{
        data: [
          { value: data.Resumen.Ingresos, itemStyle: { color: '#3b82f6' } }, 
          { value: data.Resumen.Gastos, itemStyle: { color: '#ef4444' } }
        ],
        type: 'bar', barWidth: '40%', label: { show: true, position: 'top', color: '#fff', fontWeight: '900', fontSize: 16, formatter: 'S/ {c}' }
      }]
    };
  };

  const getInsights = () => {
    if (!data || !data.DesgloseCategorias || data.DesgloseCategorias.length === 0) return null;
    const categoriasOrdenadas = [...data.DesgloseCategorias].sort((a, b) => b.Total - a.Total);
    return { 
      mayorGasto: categoriasOrdenadas[0], 
      menorGasto: categoriasOrdenadas[categoriasOrdenadas.length - 1], 
      sobraDinero: data.Resumen.Balance >= 0 
    };
  };

  const insights = getInsights();

  // Función con notMerge={true} agregado a todos los gráficos
  const renderizarGrafico = () => {
    if (vistaGrafico === 'dona-gastos') {
      return data.DesgloseCategorias.length > 0 
        ? <ReactECharts option={getPieGastosOptions()} style={{ height: '100%', width: '100%' }} notMerge={true} /> 
        : <div className="h-full flex items-center justify-center text-gray-500">Sin gastos registrados.</div>;
    }
    if (vistaGrafico === 'barras-gastos') {
      return data.DesgloseCategorias.length > 0 
        ? <ReactECharts option={getBarGastosOptions()} style={{ height: '100%', width: '100%' }} notMerge={true} /> 
        : <div className="h-full flex items-center justify-center text-gray-500">Sin gastos registrados.</div>;
    }
    if (vistaGrafico === 'ingresos') {
      return ingresosAgrupados.length > 0 
        ? <ReactECharts option={getPieIngresosOptions()} style={{ height: '100%', width: '100%' }} notMerge={true} /> 
        : <div className="h-full flex items-center justify-center text-gray-500">Sin ingresos registrados.</div>;
    }
    if (vistaGrafico === 'balance') {
      return <ReactECharts option={getBalanceOptions()} style={{ height: '100%', width: '100%' }} notMerge={true} />;
    }
  };

  return (
    <Layout>
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Reporte Financiero</h1>
          <div className="flex items-center gap-2 mt-2">
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="bg-slate-800 border-2 border-brillo-primario text-white px-2 py-1 font-bold outline-none">
              <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option>
              <option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option>
              <option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option>
              <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
            </select>
            <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="bg-slate-800 border-2 border-brillo-primario text-white px-2 py-1 font-bold outline-none">
              <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
            </select>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="text-2xl text-brillo-primario font-black animate-pulse mt-20 text-center">Analizando tus finanzas...</div>
      ) : !data ? (
        <div className="text-xl text-gray-400 mt-20 text-center border-4 border-dashed border-gray-700 p-10">No hay movimientos registrados en este periodo.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900 border-2 border-blue-500 p-6 shadow-[6px_6px_0px_0px_rgba(59,130,246,1)] transition-transform hover:-translate-y-1">
              <h3 className="text-gray-400 font-bold uppercase text-sm mb-1">Total Ingresado</h3>
              <p className="text-4xl font-black text-white">S/ {data.Resumen.Ingresos.toFixed(2)}</p>
            </div>
            
            <div className="bg-slate-900 border-2 border-red-500 p-6 shadow-[6px_6px_0px_0px_rgba(239,68,68,1)] transition-transform hover:-translate-y-1">
              <h3 className="text-gray-400 font-bold uppercase text-sm mb-1">Total Gastado</h3>
              <p className="text-4xl font-black text-white">S/ {data.Resumen.Gastos.toFixed(2)}</p>
            </div>

            <div className={`p-6 border-2 transition-transform hover:-translate-y-1 ${
              insights?.sobraDinero 
                ? 'bg-[#10B981]/20 border-[#10B981] shadow-[6px_6px_0px_0px_rgba(16,185,129,1)]' 
                : 'bg-red-500/20 border-red-500 shadow-[6px_6px_0px_0px_rgba(239,68,68,1)]'
            }`}>
              <h3 className="text-white/80 font-bold uppercase text-sm mb-1">
                {insights?.sobraDinero ? 'Dinero a favor (Ahorro)' : 'Déficit (Te faltó dinero)'}
              </h3>
              <p className="text-5xl font-black text-white">S/ {data.Resumen.Balance.toFixed(2)}</p>
            </div>
          </div>

          <div className="xl:col-span-2 flex flex-col gap-6">
            
            <div className="bg-slate-900 border-2 border-gray-700 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brillo-primario rounded-full mix-blend-screen filter blur-[64px] opacity-20 pointer-events-none"></div>
              
              <div className="flex flex-col mb-6 border-b-2 border-gray-800 pb-4 z-10">
                <h3 className="text-xl font-bold uppercase tracking-wider mb-4">Visualizador de Datos</h3>
                
                <div className="flex flex-wrap bg-slate-800 p-1 border-2 border-gray-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] gap-1">
                  <button 
                    onClick={() => setVistaGrafico('dona-gastos')}
                    className={`flex-1 min-w-[120px] px-3 py-2 font-bold text-xs md:text-sm uppercase transition-all ${vistaGrafico === 'dona-gastos' ? 'bg-brillo-primario text-white' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    🍩 Dona Gastos
                  </button>
                  <button 
                    onClick={() => setVistaGrafico('barras-gastos')}
                    className={`flex-1 min-w-[120px] px-3 py-2 font-bold text-xs md:text-sm uppercase transition-all ${vistaGrafico === 'barras-gastos' ? 'bg-brillo-primario text-white' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    📊 Barras Gastos
                  </button>
                  <button 
                    onClick={() => setVistaGrafico('ingresos')}
                    className={`flex-1 min-w-[120px] px-3 py-2 font-bold text-xs md:text-sm uppercase transition-all ${vistaGrafico === 'ingresos' ? 'bg-brillo-primario text-white' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    💰 Fuentes Ingreso
                  </button>
                  <button 
                    onClick={() => setVistaGrafico('balance')}
                    className={`flex-1 min-w-[120px] px-3 py-2 font-bold text-xs md:text-sm uppercase transition-all ${vistaGrafico === 'balance' ? 'bg-brillo-primario text-white' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    ⚖️ Balance Total
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[350px]">
                {renderizarGrafico()}
              </div>
            </div>

            {insights && (
              <div className="bg-brillo-primario text-white p-6 border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                <h3 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">🧠 Análisis Rápido</h3>
                <ul className="space-y-3 font-medium text-lg">
                  <li className="flex gap-2">
                    <span className="text-2xl">🔥</span> 
                    <span>Tu mayor fuga de dinero fue en <strong>{insights.mayorGasto.Categoria}</strong> con un total de S/ {insights.mayorGasto.Total.toFixed(2)}.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-2xl">📉</span> 
                    <span>Donde menos gastaste fue en <strong>{insights.menorGasto.Categoria}</strong> (S/ {insights.menorGasto.Total.toFixed(2)}).</span>
                  </li>
                  <li className="flex gap-2 mt-4 pt-4 border-t-2 border-white/30">
                    <span className="text-2xl">{insights.sobraDinero ? '🎉' : '⚠️'}</span>
                    <span>
                      {insights.sobraDinero 
                        ? `¡Buen trabajo! Este mes mantuviste tus gastos por debajo de tus ingresos. Te sobró el ${((data.Resumen.Balance / data.Resumen.Ingresos) * 100).toFixed(1)}% de lo que ganaste.` 
                        : `Cuidado. Este mes gastaste S/ ${Math.abs(data.Resumen.Balance).toFixed(2)} más de lo que ingresaste. Revisa la categoría de ${insights.mayorGasto.Categoria} para ajustar.`}
                    </span>
                  </li>
                </ul>
              </div>
            )}

          </div>
        </div>
      )}
    </Layout>
  );
}