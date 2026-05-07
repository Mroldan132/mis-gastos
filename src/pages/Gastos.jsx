import { useEffect, useState, useRef } from 'react';
import { ReactTabulator } from 'react-tabulator';
import 'react-tabulator/lib/styles.css';
import 'react-tabulator/css/tabulator_midnight.min.css';
import Layout from '../components/Layout';
import { apiGastos, apiCuotas } from '../services/api';

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  const tableRef = useRef(null);

  // --- NUEVOS ESTADOS DE FILTRO ---
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

  // Estados para Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Comida');
  const [nuevoComercio, setNuevoComercio] = useState('');
  const [isFraccionarModalOpen, setIsFraccionarModalOpen] = useState(false);
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [cantidadCuotas, setCantidadCuotas] = useState('');
  const [fraccionarLoading, setFraccionarLoading] = useState(false);

  const fetchGastos = async () => {
    const userId = localStorage.getItem('userId');
    const periodo = `${filtroAnio}-${filtroMes}`; // Formato YYYY-MM
    try {
      const response = await apiGastos.get(`/gastos?userId=${userId}&mes=${periodo}`);
      if (response.data.Success) {
        setGastos(response.data.Gastos);
      }
    } catch (error) {
      console.error("Error cargando gastos:", error);
    }
  };

  // Se ejecuta al cargar Y cada vez que cambien los filtros
  useEffect(() => {
    fetchGastos();
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
        CuotaIdRelacionada: ""
      });
      if (response.data.Success) {
        setIsModalOpen(false);
        setNuevoMonto('');
        setNuevoComercio('');
        fetchGastos();
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const abrirModalFraccionar = (e, cell) => {
    const rowData = cell.getRow().getData();
    setGastoSeleccionado(rowData);
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

  const columns = [
    { 
      title: "Fecha", field: "FechaOperacion", width: 160, 
      formatter: (cell) => {
        const valor = cell.getValue();
        if (!valor) return "";
        const fecha = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
        return isNaN(fecha) ? valor : fecha.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    },
    { title: "Comercio", field: "Comercio", widthGrow: 2 },
    { title: "Categoría", field: "Categoria" },
    { title: "Monto", field: "Monto", formatter: "money", formatterParams: { symbol: "S/ " }, hozAlign: "right" },
    { title: "Tipo", field: "EsPagoDeCuota", formatter: cell => cell.getValue() ? "Cuota" : "Normal" },
    { 
      title: "Acción", width: 120, hozAlign: "center",
      formatter: (cell) => {
        const data = cell.getRow().getData();
        if (data.EsGastoReferencia || data.EsPagoDeCuota) return `<span class="text-gray-500 text-xs italic font-bold">No aplicable</span>`;
        return `<button class="bg-brillo-primario text-white px-2 py-1 text-xs font-bold rounded border-2 border-transparent hover:border-white transition-all cursor-pointer">Fraccionar</button>`;
      },
      cellClick: (e, cell) => {
        const data = cell.getRow().getData();
        if (!data.EsGastoReferencia && !data.EsPagoDeCuota) abrirModalFraccionar(e, cell);
      } 
    }
  ];

  return (
    <Layout>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Mis Gastos</h1>
          <div className="flex items-center gap-2 mt-2">
            {/* SELECTORES DE FILTRO */}
            <select 
              value={filtroMes} 
              onChange={(e) => setFiltroMes(e.target.value)}
              className="bg-slate-800 border-2 border-brillo-primario text-white px-2 py-1 font-bold outline-none"
            >
              <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option>
              <option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option>
              <option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option>
              <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
            </select>
            <select 
              value={filtroAnio} 
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="bg-slate-800 border-2 border-brillo-primario text-white px-2 py-1 font-bold outline-none"
            >
              <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
            </select>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-acento-neobrutal text-slate-900 font-extrabold px-6 py-3 border-4 border-transparent hover:border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all"
        >
          + NUEVO GASTO
        </button>
      </header>

      <div className="bg-slate-900 border-2 border-gray-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-1">
        <ReactTabulator
          onRef={(r) => (tableRef.current = r)}
          data={gastos}
          columns={columns}
          layout={"fitColumns"}
          options={{ pagination: "local", paginationSize: 10, rowFormatter: (row) => { if(row.getData().EsGastoReferencia) row.getElement().style.opacity = "0.4"; } }}
        />
      </div>

      {/* --- MODAL NUEVO GASTO (Igual al anterior) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border-4 border-brillo-primario p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(139,92,246,1)] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-3xl font-extrabold text-white mb-6 uppercase tracking-tight">Registrar Gasto</h2>
            <form onSubmit={handleCrearGasto} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Comercio</label>
                <input type="text" value={nuevoComercio} onChange={(e) => setNuevoComercio(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Monto (S/)</label>
                <input type="number" step="0.01" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 outline-none" required />
              </div>
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

      {/* --- MODAL FRACCIONAR (Igual al anterior) --- */}
      {isFraccionarModalOpen && gastoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border-4 border-brillo-primario p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(139,92,246,1)] relative">
            <button onClick={() => setIsFraccionarModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-3xl font-extrabold text-white mb-2 uppercase tracking-tight">Fraccionar Gasto</h2>
            <p className="text-gray-400 mb-6 font-bold text-sm">Dividirás "{gastoSeleccionado.Comercio}" de S/ {gastoSeleccionado.Monto}.</p>
            <form onSubmit={confirmarFraccionamiento} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">¿En cuántas cuotas?</label>
                <input type="number" min="2" max="36" value={cantidadCuotas} onChange={(e) => setCantidadCuotas(e.target.value)} className="w-full bg-slate-800 border-2 border-brillo-primario text-white px-4 py-3 outline-none text-2xl font-black text-center" required />
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