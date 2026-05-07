import { useEffect, useState, useRef } from 'react';
import { ReactTabulator } from 'react-tabulator';
import 'react-tabulator/lib/styles.css';
import 'react-tabulator/css/tabulator_midnight.min.css';
import Layout from '../components/Layout';
import { apiIngresos } from '../services/api';

export default function Ingresos() {
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(false);
  const tableRef = useRef(null);

  // Filtros
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');

  const fetchIngresos = async () => {
    const userId = localStorage.getItem('userId');
    const periodo = `${filtroAnio}-${filtroMes}`;
    try {
      const response = await apiIngresos.get(`/ingresos?userId=${userId}&mes=${periodo}`);
      if (response.data.Success) setIngresos(response.data.Ingresos);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchIngresos();
  }, [filtroAnio, filtroMes]);

  const handleCrearIngreso = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiIngresos.post('/ingresos', {
        UserId: localStorage.getItem('userId'),
        Monto: parseFloat(nuevoMonto),
        Descripcion: nuevaDescripcion
      });
      if (response.data.Success) {
        setIsModalOpen(false);
        setNuevoMonto('');
        setNuevaDescripcion('');
        fetchIngresos();
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const columns = [
    { 
      title: "Fecha", field: "FechaOperacion", width: 180, 
      formatter: (cell) => {
        const valor = cell.getValue();
        if (!valor) return "";
        const fecha = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
        return isNaN(fecha) ? valor : fecha.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    },
    { title: "Descripción / Concepto", field: "Descripcion", widthGrow: 2 },
    { title: "Monto", field: "Monto", formatter: "money", formatterParams: { symbol: "S/ " }, hozAlign: "right" }
  ];

  return (
    <Layout>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Mis Ingresos</h1>
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
        <button onClick={() => setIsModalOpen(true)} className="bg-brillo-primario text-white font-extrabold px-6 py-3 border-4 border-transparent hover:border-white transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          + NUEVO INGRESO
        </button>
      </header>

      <div className="bg-slate-900 border-2 border-gray-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-1">
        <ReactTabulator onRef={(r) => (tableRef.current = r)} data={ingresos} columns={columns} layout={"fitDataStretch"} options={{ pagination: "local", paginationSize: 10 }} />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border-4 border-acento-neobrutal p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(16,185,129,1)] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-3xl font-extrabold text-white mb-6 uppercase tracking-tight">Registrar Ingreso</h2>
            <form onSubmit={handleCrearIngreso} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Descripción</label>
                <input type="text" value={nuevaDescripcion} onChange={(e) => setNuevaDescripcion(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Monto (S/)</label>
                <input type="number" step="0.01" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 outline-none" required />
              </div>
              <button type="submit" disabled={loading} className="mt-4 w-full bg-brillo-primario text-white font-extrabold text-lg py-4 border-4 border-transparent hover:border-white transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                {loading ? 'GUARDANDO...' : 'GUARDAR INGRESO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}