import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import Layout from '../components/Layout';
import { apiGastos, apiCuotas } from '../services/api';

// Función auxiliar para formatear la fecha sacada del componente principal
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

  const fetchGastos = async () => {
    const userId = localStorage.getItem('userId');
    const periodo = `${filtroAnio}-${filtroMes}`;
    try {
      const response = await apiGastos.get(`/gastos?userId=${userId}&mes=${periodo}`);
      if (response.data.Success) setGastos(response.data.Gastos);
    } catch (error) { console.error("Error cargando gastos:", error); }
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

  const handleCrearGasto = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiGastos.post('/gastos', {
        UserId: localStorage.getItem('userId'),
        Monto: parseFloat(nuevoMonto),
        Categoria: nuevaCategoria,
        Comercio: nuevoComercio,
        EsPagoDeCuota: false,
        CuotaIdRelacionada: "",
        Moneda: moneda,
        TipoCambio: moneda === 'USD' ? parseFloat(tasaManual) : 1
      });

      if (response.data.Success) {
        setIsModalOpen(false);
        setNuevoMonto('');
        setNuevoComercio('');
        setMoneda('PEN'); // Reset a soles
        fetchGastos();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalFraccionar = (rowData) => {
    setIsDetalleModalOpen(false);
    setGastoSeleccionado(rowData);
    setCantidadCuotas('');
    setIsFraccionarModalOpen(true);
  };

  const confirmarFraccionamiento = async (e) => {
    e.preventDefault();
    setFraccionarLoading(true);
    try {
      const response = await apiCuotas.post('/cuotas', {
        UserId: localStorage.getItem('userId'),
        FechaOperacionOriginal: gastoSeleccionado.FechaOperacion,
        CantidadCuotas: parseInt(cantidadCuotas)
      });
      if (response.data.Success) {
        setIsFraccionarModalOpen(false);  
        fetchGastos(); 
      }
    } catch (error) { console.error(error); } finally { setFraccionarLoading(false); }
  };

  // --- CONFIGURACIÓN DE TANSTACK TABLE ---
  const columns = useMemo(() => [
    { 
      accessorKey: 'Comercio', 
      header: 'Comercio',
      cell: (info) => <span className="font-bold">{info.getValue()}</span>
    },
    { 
      accessorKey: 'Monto', 
      header: () => <div className="text-right">Monto</div>,
      cell: (info) => {
        const monto = parseFloat(info.getValue());
        const moneda = info.row.original.Moneda;
        
        return (
          <div className="text-right w-full">
            {moneda === 'USD' ? (
              <span className="text-green-400 font-black text-sm">$ {monto.toFixed(2)}</span>
            ) : (
              <span className="text-white font-black text-sm">S/ {monto.toFixed(2)}</span>
            )}
          </div>
        );
      }
    },
    { 
      accessorKey: 'FechaOperacion', 
      header: 'Fecha',
      cell: (info) => <span>{formatFecha(info.getValue())}</span>
    },
    { 
      accessorKey: 'Categoria', 
      header: 'Categoría' 
    },
    { 
      id: 'Estado',
      header: () => <div className="text-center">Estado</div>,
      cell: (info) => {
        const data = info.row.original;
        return (
          <div className="text-center">
            {data.EsGastoReferencia || data.EsPagoDeCuota ? (
              <span className="text-gray-500 text-xs italic font-bold">No aplicable</span>
            ) : (
              <span className="text-brillo-primario text-xs font-bold border border-brillo-primario px-1 rounded">Normal</span>
            )}
          </div>
        );
      }
    }
  ], []);

  const table = useReactTable({
    data: gastos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <Layout>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Mis Gastos</h1>
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
        <button onClick={() => setIsModalOpen(true)} className="bg-acento-neobrutal text-slate-900 font-extrabold px-6 py-3 border-4 border-transparent hover:border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all">
          + NUEVO GASTO
        </button>
      </header>

      {/* --- TABLA CON TANSTACK REACT TABLE --- */}
      <div className="bg-slate-900 border-2 border-gray-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b-2 border-gray-700 bg-slate-800">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="p-4 font-extrabold text-gray-300 uppercase tracking-wider text-xs">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => {
                const esReferencia = row.original.EsGastoReferencia;
                return (
                  <tr 
                    key={row.id}
                    onClick={() => {
                      setGastoDetalle(row.original);
                      setIsDetalleModalOpen(true);
                    }}
                    className={`
                      cursor-pointer border-b border-gray-800 hover:bg-slate-800 transition-colors
                      ${esReferencia ? 'opacity-40' : 'opacity-100'}
                    `}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="p-4 text-sm text-gray-200">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500 font-bold uppercase">
                    No hay gastos en este periodo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINACIÓN NEOBRUTALISTAS */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-900 border-t-2 border-gray-700">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="bg-slate-800 text-white font-bold px-4 py-2 border-2 border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white transition-colors uppercase text-xs"
            >
              Anterior
            </button>
            <span className="text-gray-300 font-bold text-sm">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="bg-slate-800 text-white font-bold px-4 py-2 border-2 border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white transition-colors uppercase text-xs"
            >
              Siguiente
            </button>
          </div>
        )}
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
              <div className="bg-slate-800 p-4 border-l-4 border-acento-neobrutal flex justify-between items-center">
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
                className="w-full bg-brillo-primario text-white font-extrabold text-lg py-4 border-4 border-transparent hover:border-white transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
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
          <div className="bg-slate-900 border-4 border-acento-neobrutal p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(16,185,129,1)] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-3xl font-extrabold text-white mb-6 uppercase tracking-tight">Registrar Gasto</h2>
            <form onSubmit={handleCrearGasto} className="flex flex-col gap-5">
              
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Comercio</label>
                <input type="text" value={nuevoComercio} onChange={(e) => setNuevoComercio(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 outline-none" required />
              </div>

              {/* FILA 1: MONEDA Y MONTO */}
              <div className="flex gap-4">
                <div className="w-1/3">
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Moneda</label>
                  <select 
                    value={moneda} 
                    onChange={(e) => setMoneda(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 outline-none appearance-none cursor-pointer"
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
                    className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 outline-none" 
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
                    className="w-full bg-slate-800 border-2 border-brillo-primario text-white px-4 py-3 outline-none font-black text-xl text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] focus:shadow-[4px_4px_0px_0px_rgba(139,92,246,1)]" 
                    required 
                  />
                  <p className="text-[10px] text-brillo-primario font-bold mt-1 uppercase text-center">Sugerido por la API de mercado</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Categoría</label>
                <select value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 outline-none">
                  <option value="Comida">Comida</option><option value="Transporte">Transporte</option><option value="Servicios">Servicios</option><option value="Hogar">Hogar</option><option value="Entretenimiento">Entretenimiento</option><option value="Salud">Salud</option><option value="Tecnología">Tecnología</option><option value="Otros">Otros</option>
                </select>
              </div>

              <button type="submit" disabled={loading} className="mt-4 w-full bg-acento-neobrutal text-slate-900 font-extrabold text-lg py-4 border-4 border-transparent hover:border-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                {loading ? 'GUARDANDO...' : 'GUARDAR GASTO'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- 3. MODAL FRACCIONAR --- */}
      {isFraccionarModalOpen && gastoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-4 border-brillo-primario p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(139,92,246,1)] relative">
            <button onClick={() => setIsFraccionarModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-3xl font-extrabold text-white mb-2 uppercase tracking-tight">Fraccionar Gasto</h2>
            <p className="text-gray-400 mb-6 font-bold text-sm">Dividirás "{gastoSeleccionado.Comercio}" de {gastoSeleccionado.Moneda === 'USD' ? '$' : 'S/'} {gastoSeleccionado.Monto}.</p>
            <form onSubmit={confirmarFraccionamiento} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">¿En cuántas cuotas?</label>
                <input type="number" min="2" max="36" value={cantidadCuotas} onChange={(e) => setCantidadCuotas(e.target.value)} className="w-full bg-slate-800 border-2 border-brillo-primario text-white px-4 py-3 outline-none text-2xl font-black text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] focus:shadow-[4px_4px_0px_0px_rgba(139,92,246,1)]" required />
              </div>
              <button type="submit" disabled={fraccionarLoading} className="mt-4 w-full bg-brillo-primario text-white font-extrabold text-lg py-4 border-4 border-transparent hover:border-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                {fraccionarLoading ? 'PROCESANDO...' : 'CONFIRMAR CUOTAS'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}