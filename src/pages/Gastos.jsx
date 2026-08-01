import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  DollarSign, 
  Activity, 
  CreditCard,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// --- MOCK DATA PARA PREVISUALIZACIÓN ---
// Ya que no tenemos @tanstack/react-table ni servicios reales, usaremos un componente funcional nativo.
const mockGastos = [
  { id: 1, Comercio: 'Supermercado Metro', Monto: 150.50, Moneda: 'PEN', FechaOperacion: '2026-08-01T10:30:00', Categoria: 'Comida', EsGastoReferencia: false, EsPagoDeCuota: false },
  { id: 2, Comercio: 'Netflix', Monto: 15.99, Moneda: 'USD', FechaOperacion: '2026-08-05T14:15:00', Categoria: 'Entretenimiento', EsGastoReferencia: false, EsPagoDeCuota: false },
  { id: 3, Comercio: 'Laptop (Cuota 2/12)', Monto: 250.00, Moneda: 'PEN', FechaOperacion: '2026-08-10T09:00:00', Categoria: 'Tecnología', EsGastoReferencia: true, EsPagoDeCuota: true },
  { id: 4, Comercio: 'Restaurante Central', Monto: 300.00, Moneda: 'PEN', FechaOperacion: '2026-08-12T20:00:00', Categoria: 'Comida', EsGastoReferencia: false, EsPagoDeCuota: false },
  { id: 5, Comercio: 'Uber', Monto: 25.00, Moneda: 'PEN', FechaOperacion: '2026-08-15T18:30:00', Categoria: 'Transporte', EsGastoReferencia: false, EsPagoDeCuota: false },
];

const formatFecha = (valor) => {
  if (!valor) return "";
  const fecha = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
  return isNaN(fecha) ? valor : fecha.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Layout Mock
const LayoutMock = ({ children }) => (
  <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
    <div className="max-w-6xl mx-auto">
      {children}
    </div>
  </div>
);

export default function Gastos() {
  const [gastos, setGastos] = useState(mockGastos); // Usamos mock data
  const [loading, setLoading] = useState(false);

  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

  // Nuevos estados para UI (Pestañas y Búsqueda)
  const [activeTab, setActiveTab] = useState('principales');
  const [globalFilter, setGlobalFilter] = useState('');

  // Estados para Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Comida');
  const [nuevoComercio, setNuevoComercio] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [tasaManual, setTasaManual] = useState(3.75);

  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [gastoDetalle, setGastoDetalle] = useState(null);

  const [isFraccionarModalOpen, setIsFraccionarModalOpen] = useState(false);
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [cantidadCuotas, setCantidadCuotas] = useState('');
  const [fraccionarLoading, setFraccionarLoading] = useState(false);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      // 1. Filtro por Pestaña
      let matchTab = true;
      if (activeTab === 'principales') matchTab = !g.EsGastoReferencia && !g.EsPagoDeCuota;
      if (activeTab === 'referencias') matchTab = g.EsGastoReferencia || g.EsPagoDeCuota;

      // 2. Filtro de Búsqueda Global
      const matchSearch = globalFilter === '' || 
        g.Comercio?.toLowerCase().includes(globalFilter.toLowerCase()) || 
        g.Categoria?.toLowerCase().includes(globalFilter.toLowerCase());

      return matchTab && matchSearch;
    });
  }, [gastos, activeTab, globalFilter]);

  const totales = useMemo(() => {
    let pen = 0;
    let usd = 0;
    
    gastosFiltrados.forEach(g => {
      if (g.Moneda === 'PEN') pen += parseFloat(g.Monto);
      if (g.Moneda === 'USD') usd += parseFloat(g.Monto);
    });
    
    return { pen, usd };
  }, [gastosFiltrados]);

  return (
    <LayoutMock>
      {/* HEADER Y FILTROS DE FECHA */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-indigo-500" />
            Mis Gastos
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <select 
              value={filtroMes} 
              onChange={(e) => setFiltroMes(e.target.value)} 
              className="bg-slate-800 border-2 border-indigo-500 text-white px-3 py-2 font-bold outline-none shadow-[2px_2px_0px_0px_rgba(99,102,241,1)] cursor-pointer focus:shadow-[4px_4px_0px_0px_rgba(99,102,241,1)] transition-all"
            >
              <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option>
              <option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option>
              <option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option>
              <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
            </select>
            <select 
              value={filtroAnio} 
              onChange={(e) => setFiltroAnio(e.target.value)} 
              className="bg-slate-800 border-2 border-indigo-500 text-white px-3 py-2 font-bold outline-none shadow-[2px_2px_0px_0px_rgba(99,102,241,1)] cursor-pointer focus:shadow-[4px_4px_0px_0px_rgba(99,102,241,1)] transition-all"
            >
              <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
            </select>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-emerald-400 text-slate-900 font-extrabold px-6 py-3 border-4 border-transparent hover:border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5 font-bold" />
          NUEVO GASTO
        </button>
      </header>

      {/* TARJETAS DE RESUMEN (TOTALES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 border-2 border-slate-600 p-5 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex justify-between items-center transition-transform hover:-translate-y-1">
          <div className="flex flex-col">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Total Soles</span>
            <span className="text-3xl font-black text-white">S/ {totales.pen.toFixed(2)}</span>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-full">
             <DollarSign className="w-8 h-8 text-slate-300" />
          </div>
        </div>
        <div className="bg-slate-800 border-2 border-slate-600 p-5 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.3)] flex justify-between items-center transition-transform hover:-translate-y-1">
           <div className="flex flex-col">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Total Dólares</span>
            <span className="text-3xl font-black text-emerald-400">$ {totales.usd.toFixed(2)}</span>
          </div>
           <div className="p-3 bg-emerald-900/30 rounded-full">
             <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* CONTROLES: PESTAÑAS Y BUSCADOR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        
        {/* Pestañas Neobrutalistas */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <button 
            onClick={() => setActiveTab('principales')}
            className={`px-4 py-2 font-bold text-sm uppercase border-2 transition-all whitespace-nowrap ${activeTab === 'principales' ? 'bg-indigo-500 border-indigo-500 text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
          >
            Principales
          </button>
          <button 
            onClick={() => setActiveTab('referencias')}
            className={`px-4 py-2 font-bold text-sm uppercase border-2 transition-all whitespace-nowrap ${activeTab === 'referencias' ? 'bg-slate-600 border-slate-400 text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
          >
            Cuotas / Ref.
          </button>
          <button 
            onClick={() => setActiveTab('todos')}
            className={`px-4 py-2 font-bold text-sm uppercase border-2 transition-all whitespace-nowrap ${activeTab === 'todos' ? 'bg-white border-white text-slate-900 shadow-[3px_3px_0px_0px_rgba(99,102,241,1)]' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
          >
            Todos
          </button>
        </div>

        {/* Buscador */}
        <div className="w-full md:w-1/3 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Buscar comercio o categoría..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="w-full bg-slate-800 border-2 border-slate-600 focus:border-white text-white pl-10 pr-4 py-2 outline-none font-bold placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors"
          />
        </div>
      </div>

      {/* --- TABLA NATIVA (SIN TANSTACK PARA PREVIEW) --- */}
      <div className="bg-slate-800 border-2 border-slate-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-700 bg-slate-900/50">
                 <th className="p-4 font-extrabold text-slate-300 uppercase tracking-wider text-xs">Comercio</th>
                 <th className="p-4 font-extrabold text-slate-300 uppercase tracking-wider text-xs text-right">Monto</th>
                 <th className="p-4 font-extrabold text-slate-300 uppercase tracking-wider text-xs">Fecha</th>
                 <th className="p-4 font-extrabold text-slate-300 uppercase tracking-wider text-xs">Categoría</th>
                 <th className="p-4 font-extrabold text-slate-300 uppercase tracking-wider text-xs text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.length > 0 ? (
                gastosFiltrados.map(gasto => {
                  const esReferencia = gasto.EsGastoReferencia || gasto.EsPagoDeCuota;
                  return (
                    <tr 
                      key={gasto.id}
                      onClick={() => {
                        setGastoDetalle(gasto);
                        setIsDetalleModalOpen(true);
                      }}
                      className={`
                        cursor-pointer border-b border-slate-700 hover:bg-slate-700/50 transition-colors
                        ${esReferencia && activeTab === 'todos' ? 'opacity-50' : 'opacity-100'}
                      `}
                    >
                      <td className="p-4 text-sm text-slate-200 font-bold">{gasto.Comercio}</td>
                      <td className="p-4 text-sm text-right font-black">
                        {gasto.Moneda === 'USD' ? (
                          <span className="text-emerald-400">$ {gasto.Monto.toFixed(2)}</span>
                        ) : (
                          <span className="text-white">S/ {gasto.Monto.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-300">{formatFecha(gasto.FechaOperacion)}</td>
                      <td className="p-4 text-sm text-slate-300">{gasto.Categoria}</td>
                      <td className="p-4 text-center">
                        {esReferencia ? (
                          <span className="text-slate-400 text-xs italic font-bold">Ref/Cuota</span>
                        ) : (
                          <span className="text-indigo-400 text-xs font-bold border border-indigo-400/50 px-2 py-1 rounded bg-indigo-900/20">Normal</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center border-dashed border-2 border-slate-700 m-4">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <Search className="w-12 h-12 mb-4 text-slate-400" />
                      <p className="text-slate-300 font-bold uppercase text-lg">No se encontraron resultados</p>
                      <p className="text-slate-500 text-sm mt-2">Intenta ajustar tu búsqueda o cambiar de pestaña</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- 1. MODAL DE DETALLE DEL GASTO --- */}
      {isDetalleModalOpen && gastoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border-4 border-white p-6 max-w-sm w-full shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] relative animate-fade-in">
            <button 
              onClick={() => setIsDetalleModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <p className="text-slate-400 font-bold uppercase text-xs mb-1 flex items-center gap-1">
               <Activity className="w-3 h-3" />
               Detalle del Gasto
            </p>
            <h2 className="text-3xl font-extrabold text-white mb-6 uppercase tracking-tight break-words leading-tight">
              {gastoDetalle.Comercio}
            </h2>

            <div className="flex flex-col gap-4 mb-8">
              <div className="bg-slate-900 p-4 border-l-4 border-emerald-400 flex justify-between items-center shadow-inner">
                <span className="text-sm text-slate-400 font-bold uppercase">Monto</span>
                <span className={`text-3xl font-black ${gastoDetalle.Moneda === 'USD' ? 'text-emerald-400' : 'text-white'}`}>
                  {gastoDetalle.Moneda === 'USD' ? '$' : 'S/'} {gastoDetalle.Monto.toFixed(2)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-3 border-2 border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Fecha</p>
                  <p className="text-sm font-bold text-white mt-1">{formatFecha(gastoDetalle.FechaOperacion).split(',')[0]}</p>
                </div>
                <div className="bg-slate-900 p-3 border-2 border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Categoría</p>
                  <p className="text-sm font-bold text-white mt-1">{gastoDetalle.Categoria}</p>
                </div>
              </div>
            </div>

            {(!gastoDetalle.EsGastoReferencia && !gastoDetalle.EsPagoDeCuota) ? (
              <button 
                onClick={() => {
                   setIsDetalleModalOpen(false);
                   setGastoSeleccionado(gastoDetalle);
                   setIsFraccionarModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-indigo-500 text-white font-extrabold text-lg py-4 border-4 border-transparent hover:border-white transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
              >
                <CreditCard className="w-5 h-5" />
                FRACCIONAR
              </button>
            ) : (
              <div className="w-full bg-slate-900 text-slate-400 text-center font-bold text-sm py-4 border-2 border-slate-700">
                {gastoDetalle.EsPagoDeCuota ? "Este gasto es una cuota" : "Este gasto ya fue fraccionado"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 2. MODAL NUEVO GASTO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border-4 border-emerald-400 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(52,211,153,1)] relative">
             <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-extrabold text-white mb-6 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-8 h-8 text-emerald-400" />
              Registrar Gasto
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }} className="flex flex-col gap-5">
              
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Comercio</label>
                <input type="text" value={nuevoComercio} onChange={(e) => setNuevoComercio(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-600 focus:border-emerald-400 text-white px-4 py-3 outline-none transition-colors" required />
              </div>

              <div className="flex gap-4">
                <div className="w-1/3">
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Moneda</label>
                  <select 
                    value={moneda} 
                    onChange={(e) => setMoneda(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-600 focus:border-emerald-400 text-white px-4 py-3 outline-none appearance-none cursor-pointer transition-colors"
                  >
                    <option value="PEN">Soles</option>
                    <option value="USD">Dólares</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Monto</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={nuevoMonto} 
                    onChange={(e) => setNuevoMonto(e.target.value)} 
                    className="w-full bg-slate-900 border-2 border-slate-600 focus:border-emerald-400 text-white px-4 py-3 outline-none transition-colors font-bold" 
                    required 
                  />
                </div>
              </div>

              {moneda === 'USD' && (
                <div className="p-4 bg-indigo-900/20 border-2 border-indigo-500/50 rounded mt-2">
                  <label className="block text-xs font-bold text-indigo-300 mb-2 uppercase tracking-wider text-center">Tipo de Cambio a Aplicar</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    value={tasaManual} 
                    onChange={(e) => setTasaManual(e.target.value)} 
                    className="w-full bg-slate-900 border-2 border-indigo-500 text-white px-4 py-2 outline-none font-black text-xl text-center focus:shadow-[4px_4px_0px_0px_rgba(99,102,241,1)] transition-shadow" 
                    required 
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Categoría</label>
                <select value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-600 focus:border-emerald-400 text-white px-4 py-3 outline-none cursor-pointer transition-colors">
                  <option value="Comida">Comida</option><option value="Transporte">Transporte</option><option value="Servicios">Servicios</option><option value="Hogar">Hogar</option><option value="Entretenimiento">Entretenimiento</option><option value="Salud">Salud</option><option value="Tecnología">Tecnología</option><option value="Otros">Otros</option>
                </select>
              </div>

              <button type="submit" className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-400 text-slate-900 font-extrabold text-lg py-4 border-4 border-transparent hover:border-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                 <Plus className="w-6 h-6" />
                GUARDAR GASTO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- 3. MODAL FRACCIONAR --- */}
      {isFraccionarModalOpen && gastoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border-4 border-indigo-500 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(99,102,241,1)] relative">
            <button 
              onClick={() => setIsFraccionarModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
               <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-extrabold text-white mb-2 uppercase tracking-tight flex items-center gap-2">
               <CreditCard className="w-8 h-8 text-indigo-400" />
               Fraccionar
            </h2>
            <div className="bg-slate-900 p-3 border-l-4 border-slate-500 mb-6">
              <p className="text-slate-300 font-bold text-sm">Vas a dividir:</p>
              <p className="text-white font-black text-lg">"{gastoSeleccionado.Comercio}"</p>
              <p className="text-indigo-400 font-black">Por {gastoSeleccionado.Moneda === 'USD' ? '$' : 'S/'} {gastoSeleccionado.Monto.toFixed(2)}</p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); setIsFraccionarModalOpen(false); }} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider text-center">¿En cuántas cuotas?</label>
                <input 
                  type="number" 
                  min="2" max="36" 
                  value={cantidadCuotas} 
                  onChange={(e) => setCantidadCuotas(e.target.value)} 
                  className="w-full bg-slate-900 border-2 border-indigo-500 text-white px-4 py-4 outline-none text-3xl font-black text-center shadow-inner focus:shadow-[4px_4px_0px_0px_rgba(99,102,241,1)] transition-shadow" 
                  placeholder="Ej: 3"
                  required 
                />
              </div>
              <button type="submit" className="mt-4 w-full bg-indigo-500 text-white font-extrabold text-lg py-4 border-4 border-transparent hover:border-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                CONFIRMAR CUOTAS
              </button>
            </form>
          </div>
        </div>
      )}
    </LayoutMock>
  );
}