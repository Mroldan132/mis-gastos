import React, { useEffect, useState, useMemo } from 'react';

// --- MOCK DATA PARA LA VISTA PREVIA ---
const mockGastos = [
  { id: 1, Comercio: "Supermercado Wong", Monto: 150.50, Categoria: "Comida", Moneda: "PEN", FechaOperacion: "2024-03-15T10:30:00", EsGastoReferencia: false, EsPagoDeCuota: false },
  { id: 2, Comercio: "Netflix", Monto: 15.99, Categoria: "Entretenimiento", Moneda: "USD", FechaOperacion: "2024-03-12T00:00:00", EsGastoReferencia: false, EsPagoDeCuota: false },
  { id: 3, Comercio: "Pago Tarjeta (Cuota 2/12)", Monto: 350.00, Categoria: "Servicios", Moneda: "PEN", FechaOperacion: "2024-03-10T14:20:00", EsGastoReferencia: false, EsPagoDeCuota: true },
  { id: 4, Comercio: "Uber", Monto: 25.00, Categoria: "Transporte", Moneda: "PEN", FechaOperacion: "2024-03-16T18:45:00", EsGastoReferencia: false, EsPagoDeCuota: false },
  { id: 5, Comercio: "Alquiler (Referencia)", Monto: 1200.00, Categoria: "Hogar", Moneda: "PEN", FechaOperacion: "2024-03-01T08:00:00", EsGastoReferencia: true, EsPagoDeCuota: false },
];

// --- COMPONENTES SIMULADOS ---
// Simulamos el Layout
const Layout = ({ children }) => (
  <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans">
    <div className="max-w-6xl mx-auto">
      {children}
    </div>
  </div>
);

// Función auxiliar para formatear la fecha
const formatFecha = (valor) => {
  if (!valor) return "";
  const fecha = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
  return isNaN(fecha) ? valor : fecha.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

  // NUEVOS ESTADOS: Buscador y Pestañas
  const [globalFilter, setGlobalFilter] = useState('');
  const [tipoVista, setTipoVista] = useState('reales'); // 'todos', 'reales', 'referencias'

  // Estados para Modal de Nuevo Gasto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Comida');
  const [nuevoComercio, setNuevoComercio] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [tasaManual, setTasaManual] = useState(3.75);

  // Estados para Modal de Detalle de Gasto
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [gastoDetalle, setGastoDetalle] = useState(null);

  // Estados para Modal de Fraccionar
  const [isFraccionarModalOpen, setIsFraccionarModalOpen] = useState(false);
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [cantidadCuotas, setCantidadCuotas] = useState('');
  const [fraccionarLoading, setFraccionarLoading] = useState(false);

  const fetchGastos = () => {
    // Simulamos la carga de la API
    setGastos(mockGastos);
  };

  useEffect(() => { 
    fetchGastos(); 
    
    // Obtener el tipo de cambio del día automáticamente al cargar
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data?.rates?.PEN) {
          setTasaManual(data.rates.PEN);
        }
      })
      .catch(err => console.error("Error obteniendo tipo de cambio:", err));
  }, [filtroAnio, filtroMes]);

  const handleCrearGasto = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulación de guardado
    setTimeout(() => {
      const nuevo = {
        id: Math.random(),
        Comercio: nuevoComercio,
        Monto: parseFloat(nuevoMonto),
        Categoria: nuevaCategoria,
        Moneda: moneda,
        FechaOperacion: new Date().toISOString(),
        EsGastoReferencia: false,
        EsPagoDeCuota: false
      };
      setGastos([...gastos, nuevo]);
      setIsModalOpen(false);
      setNuevoMonto('');
      setNuevoComercio('');
      setMoneda('PEN'); 
      setLoading(false);
    }, 500);
  };

  const abrirModalFraccionar = (rowData) => {
    setIsDetalleModalOpen(false);
    setGastoSeleccionado(rowData);
    setCantidadCuotas('');
    setIsFraccionarModalOpen(true);
  };

  const confirmarFraccionamiento = (e) => {
    e.preventDefault();
    setFraccionarLoading(true);
    setTimeout(() => {
      setIsFraccionarModalOpen(false);  
      setFraccionarLoading(false);
    }, 500);
  };

  // --- LÓGICA DE FILTRADO MANUAL (Reemplazando Tanstack temporalmente) ---
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(gasto => {
      // 1. Filtro por Pestaña
      const esReferenciaOCuota = gasto.EsGastoReferencia || gasto.EsPagoDeCuota;
      let cumpleVista = true;
      if (tipoVista === 'reales') cumpleVista = !esReferenciaOCuota;
      if (tipoVista === 'referencias') cumpleVista = esReferenciaOCuota;

      // 2. Filtro por Buscador Global
      const termino = globalFilter.toLowerCase();
      const cumpleBusqueda = gasto.Comercio.toLowerCase().includes(termino) || 
                             gasto.Categoria.toLowerCase().includes(termino);

      return cumpleVista && cumpleBusqueda;
    });
  }, [gastos, tipoVista, globalFilter]);

  // Calcular totales sobre las filas resultantes
  const totales = useMemo(() => {
    let totalPEN = 0;
    let totalUSD = 0;
    
    gastosFiltrados.forEach(row => {
      const monto = parseFloat(row.Monto);
      if (row.Moneda === 'USD') {
        totalUSD += monto;
      } else {
        totalPEN += monto;
      }
    });

    return { totalPEN, totalUSD };
  }, [gastosFiltrados]);

  // Colores y clases para mantener la estética
  const colorPrimario = "emerald-400"; // Reemplazo de brillo-primario
  const colorAcento = "violet-500";   // Reemplazo de acento-neobrutal

  return (
    <Layout>
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Mis Gastos</h1>
          <div className="flex items-center gap-2 mt-2">
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className={`bg-slate-800 border-2 border-${colorPrimario} text-white px-2 py-1 font-bold outline-none cursor-pointer`}>
              <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option>
              <option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option>
              <option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option>
              <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
            </select>
            <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className={`bg-slate-800 border-2 border-${colorPrimario} text-white px-2 py-1 font-bold outline-none cursor-pointer`}>
              <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
            </select>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={`bg-${colorAcento} text-slate-900 font-extrabold px-6 py-3 border-4 border-transparent hover:border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all`}>
          + NUEVO GASTO
        </button>
      </header>

      {/* --- PANEL DE CONTROLES: PESTAÑAS Y BUSCADOR --- */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setTipoVista('reales')}
            className={`px-4 py-2 font-extrabold uppercase text-xs transition-all border-2 ${tipoVista === 'reales' ? `bg-${colorPrimario} text-white border-transparent shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]` : 'bg-slate-800 text-gray-400 border-gray-600 hover:text-white'}`}
          >
            Gastos Reales
          </button>
          <button 
            onClick={() => setTipoVista('referencias')}
            className={`px-4 py-2 font-extrabold uppercase text-xs transition-all border-2 ${tipoVista === 'referencias' ? 'bg-gray-400 text-slate-900 border-transparent shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'bg-slate-800 text-gray-400 border-gray-600 hover:text-white'}`}
          >
            Referencias / Cuotas
          </button>
          <button 
            onClick={() => setTipoVista('todos')}
            className={`px-4 py-2 font-extrabold uppercase text-xs transition-all border-2 ${tipoVista === 'todos' ? 'bg-white text-slate-900 border-transparent shadow-[4px_4px_0px_0px_rgba(139,92,246,1)]' : 'bg-slate-800 text-gray-400 border-gray-600 hover:text-white'}`}
          >
            Ver Todos
          </button>
        </div>

        <div className="w-full md:w-1/3 relative">
          <input 
            type="text" 
            placeholder="Buscar comercio o categoría..." 
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className={`w-full bg-slate-800 border-2 border-gray-600 focus:border-${colorAcento} text-white px-4 py-2 outline-none font-bold placeholder-gray-500 transition-colors`}
          />
          {globalFilter && (
            <button 
              onClick={() => setGlobalFilter('')} 
              className="absolute right-3 top-2.5 text-gray-400 hover:text-white font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* --- PANEL DE RESUMEN DE TOTALES --- */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 p-4 border-2 border-gray-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Mostrado (Soles)</p>
          <p className="text-2xl font-black text-white">S/ {totales.totalPEN.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 p-4 border-2 border-gray-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Mostrado (Dólares)</p>
          <p className="text-2xl font-black text-green-400">$ {totales.totalUSD.toFixed(2)}</p>
        </div>
      </div>

      {/* --- TABLA HTML ESTÁNDAR --- */}
      <div className="bg-slate-900 border-2 border-gray-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-1 mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-700 bg-slate-800">
                <th className="p-4 font-extrabold text-gray-300 uppercase tracking-wider text-xs">Comercio</th>
                <th className="p-4 font-extrabold text-gray-300 uppercase tracking-wider text-xs text-right">Monto</th>
                <th className="p-4 font-extrabold text-gray-300 uppercase tracking-wider text-xs">Fecha</th>
                <th className="p-4 font-extrabold text-gray-300 uppercase tracking-wider text-xs">Categoría</th>
                <th className="p-4 font-extrabold text-gray-300 uppercase tracking-wider text-xs text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map(row => {
                const esReferencia = row.EsGastoReferencia || row.EsPagoDeCuota;
                return (
                  <tr 
                    key={row.id}
                    onClick={() => {
                      setGastoDetalle(row);
                      setIsDetalleModalOpen(true);
                    }}
                    className={`
                      cursor-pointer border-b border-gray-800 hover:bg-slate-800 transition-colors
                      ${esReferencia ? 'opacity-40 hover:opacity-80' : 'opacity-100'}
                    `}
                  >
                    <td className="p-4 text-sm text-gray-200 font-bold">{row.Comercio}</td>
                    <td className="p-4 text-sm">
                      <div className="text-right w-full">
                        {row.Moneda === 'USD' ? (
                          <span className="text-green-400 font-black text-sm">$ {row.Monto.toFixed(2)}</span>
                        ) : (
                          <span className="text-white font-black text-sm">S/ {row.Monto.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-200">{formatFecha(row.FechaOperacion)}</td>
                    <td className="p-4 text-sm text-gray-200">{row.Categoria}</td>
                    <td className="p-4 text-sm text-center">
                       {esReferencia ? (
                        <span className="text-gray-500 text-xs italic font-bold">No aplicable</span>
                      ) : (
                        <span className={`text-${colorPrimario} text-xs font-bold border border-${colorPrimario} px-1 rounded`}>Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {gastosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500 font-bold uppercase bg-slate-800/50">
                    No se encontraron gastos con estos filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- 1. MODAL DE DETALLE DEL GASTO --- */}
      {isDetalleModalOpen && gastoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-4 border-white p-6 max-w-sm w-full shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] relative animate-fade-in">
            <button onClick={() => setIsDetalleModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            
            <p className="text-gray-400 font-bold uppercase text-xs mb-1">Detalle del Gasto</p>
            <h2 className="text-3xl font-extrabold text-white mb-6 uppercase tracking-tight break-words leading-tight">
              {gastoDetalle.Comercio}
            </h2>

            <div className="flex flex-col gap-4 mb-8">
              <div className={`bg-slate-800 p-4 border-l-4 border-${colorAcento} flex justify-between items-center`}>
                <span className="text-sm text-gray-400 font-bold uppercase">Monto</span>
                <span className={`text-3xl font-black ${gastoDetalle.Moneda === 'USD' ? 'text-green-400' : 'text-white'}`}>
                  {gastoDetalle.Moneda === 'USD' ? '$' : 'S/'} {gastoDetalle.Monto.toFixed(2)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-3 border-2 border-gray-700">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Fecha</p>
                  <p className="text-sm font-bold text-white mt-1">{formatFecha(gastoDetalle.FechaOperacion).split(',')[0]}</p>
                </div>
                <div className="bg-slate-800 p-3 border-2 border-gray-700">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Categoría</p>
                  <p className="text-sm font-bold text-white mt-1">{gastoDetalle.Categoria}</p>
                </div>
              </div>
            </div>

            {(!gastoDetalle.EsGastoReferencia && !gastoDetalle.EsPagoDeCuota) ? (
              <button 
                onClick={() => abrirModalFraccionar(gastoDetalle)}
                className={`w-full bg-${colorPrimario} text-white font-extrabold text-lg py-4 border-4 border-transparent hover:border-white transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]`}
              >
                💳 FRACCIONAR EN CUOTAS
              </button>
            ) : (
              <div className="w-full bg-gray-800 text-gray-400 text-center font-bold text-sm py-4 border-2 border-gray-700">
                {gastoDetalle.EsPagoDeCuota ? "Este gasto es una cuota" : "Este gasto ya fue fraccionado"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 2. MODAL NUEVO GASTO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`bg-slate-900 border-4 border-${colorAcento} p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(16,185,129,1)] relative`}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-3xl font-extrabold text-white mb-6 uppercase tracking-tight">Registrar Gasto</h2>
            <form onSubmit={handleCrearGasto} className="flex flex-col gap-5">
              
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Comercio</label>
                <input type="text" value={nuevoComercio} onChange={(e) => setNuevoComercio(e.target.value)} className={`w-full bg-slate-800 border-2 border-gray-600 focus:border-${colorAcento} text-white px-4 py-3 outline-none`} required />
              </div>

              {/* FILA 1: MONEDA Y MONTO */}
              <div className="flex gap-4">
                <div className="w-1/3">
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Moneda</label>
                  <select 
                    value={moneda} 
                    onChange={(e) => setMoneda(e.target.value)}
                    className={`w-full bg-slate-800 border-2 border-gray-600 focus:border-${colorAcento} text-white px-4 py-3 outline-none appearance-none cursor-pointer`}
                  >
                    <option value="PEN">Soles</option>
                    <option value="USD">Dólares</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Monto</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={nuevoMonto} 
                    onChange={(e) => setNuevoMonto(e.target.value)} 
                    className={`w-full bg-slate-800 border-2 border-gray-600 focus:border-${colorAcento} text-white px-4 py-3 outline-none`} 
                    required 
                  />
                </div>
              </div>

              {/* FILA 2: TIPO DE CAMBIO */}
              {moneda === 'USD' && (
                <div className="animate-slide-down">
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Tipo de Cambio Aplicado</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    value={tasaManual} 
                    onChange={(e) => setTasaManual(e.target.value)} 
                    className={`w-full bg-slate-800 border-2 border-${colorPrimario} text-white px-4 py-3 outline-none font-black text-xl text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] focus:shadow-[4px_4px_0px_0px_rgba(139,92,246,1)]`} 
                    required 
                  />
                  <p className={`text-[10px] text-${colorPrimario} font-bold mt-1 uppercase text-center`}>Sugerido por la API de mercado</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Categoría</label>
                <select value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} className={`w-full bg-slate-800 border-2 border-gray-600 focus:border-${colorAcento} text-white px-4 py-3 outline-none`}>
                  <option value="Comida">Comida</option><option value="Transporte">Transporte</option><option value="Servicios">Servicios</option><option value="Hogar">Hogar</option><option value="Entretenimiento">Entretenimiento</option><option value="Salud">Salud</option><option value="Tecnología">Tecnología</option><option value="Otros">Otros</option>
                </select>
              </div>

              <button type="submit" disabled={loading} className={`mt-4 w-full bg-${colorAcento} text-slate-900 font-extrabold text-lg py-4 border-4 border-transparent hover:border-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]`}>
                {loading ? 'GUARDANDO...' : 'GUARDAR GASTO'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- 3. MODAL FRACCIONAR --- */}
      {isFraccionarModalOpen && gastoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`bg-slate-900 border-4 border-${colorPrimario} p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(139,92,246,1)] relative`}>
            <button onClick={() => setIsFraccionarModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-3xl font-extrabold text-white mb-2 uppercase tracking-tight">Fraccionar Gasto</h2>
            <p className="text-gray-400 mb-6 font-bold text-sm">Dividirás "{gastoSeleccionado.Comercio}" de {gastoSeleccionado.Moneda === 'USD' ? '$' : 'S/'} {gastoSeleccionado.Monto}.</p>
            <form onSubmit={confirmarFraccionamiento} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">¿En cuántas cuotas?</label>
                <input type="number" min="2" max="36" value={cantidadCuotas} onChange={(e) => setCantidadCuotas(e.target.value)} className={`w-full bg-slate-800 border-2 border-${colorPrimario} text-white px-4 py-3 outline-none text-2xl font-black text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] focus:shadow-[4px_4px_0px_0px_rgba(139,92,246,1)]`} required />
              </div>
              <button type="submit" disabled={fraccionarLoading} className={`mt-4 w-full bg-${colorPrimario} text-white font-extrabold text-lg py-4 border-4 border-transparent hover:border-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]`}>
                {fraccionarLoading ? 'PROCESANDO...' : 'CONFIRMAR CUOTAS'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}