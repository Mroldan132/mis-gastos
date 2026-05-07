import { useEffect, useState, useRef } from 'react';
import { ReactTabulator } from 'react-tabulator';
import 'react-tabulator/lib/styles.css';
import 'react-tabulator/css/tabulator_midnight.min.css';
import Layout from '../components/Layout';
import { apiCuotas } from '../services/api';

export default function Cuotas() {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(false);
  const tableRef = useRef(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cuotaEditando, setCuotaEditando] = useState(null);
  const [nuevoMonto, setNuevoMonto] = useState('');

  const fetchCuotas = async () => {
    const userId = localStorage.getItem('userId');
    try {
      const response = await apiCuotas.get(`/cuotas?userId=${userId}`);
      if (response.data.Success) {
        setCuotas(response.data.Cuotas);
      }
    } catch (error) {
      console.error("Error cargando cuotas:", error);
    }
  };

  useEffect(() => {
    fetchCuotas();
  }, []);

  // --- PAGAR CUOTA ---
  const handlePagarCuota = async (e, cell) => {
    const cuota = cell.getRow().getData();
    
    if (cuota.Estado === 'Pagado') return;

    const confirmar = window.confirm(`¿Confirmar el pago de S/ ${cuota.Monto} por ${cuota.Comercio}?`);
    if (!confirmar) return;

    try {
      // Como tu Lambda de C# ya creó el gasto en el futuro, solo le cambiamos el Estado a Pagado
      const response = await apiCuotas.put('/cuotas', {
        UserId: localStorage.getItem('userId'),
        FechaOperacion: cuota.FechaOperacion, // LLave para DynamoDB
        Estado: 'Pagado'
      });

      if (response.data.Success) {
        fetchCuotas(); 
      }
    } catch (error) {
      console.error("Error al pagar la cuota:", error);
    }
  };

  // --- EDITAR MONTO ---
  const abrirModalEditar = (e, cell) => {
    const cuota = cell.getRow().getData();
    if (cuota.Estado === 'Pagado') return; 
    setCuotaEditando(cuota);
    setNuevoMonto(cuota.Monto);
    setIsEditModalOpen(true);
  };

  const guardarNuevoMonto = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiCuotas.put('/cuotas', {
        UserId: localStorage.getItem('userId'),
        FechaOperacion: cuotaEditando.FechaOperacion, // LLave para DynamoDB
        Monto: parseFloat(nuevoMonto)
      });
      if (response.data.Success) {
        setIsEditModalOpen(false);
        fetchCuotas();
      }
    } catch (error) {
      console.error("Error al editar cuota:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Detalle de Cuota", field: "Comercio", widthGrow: 2, formatter: "textarea" },
    { 
      title: "Fecha de Cobro", field: "FechaOperacion", width: 140, 
      formatter: (cell) => {
        const valor = cell.getValue();
        if (!valor) return "";
        const fecha = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
        return isNaN(fecha) ? valor : fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    },
    { title: "Monto", field: "Monto", formatter: "money", formatterParams: { symbol: "S/ " }, hozAlign: "right", width: 120 },
    { 
      title: "Estado", field: "Estado", width: 120, hozAlign: "center",
      formatter: (cell) => {
        const estado = cell.getValue();
        if (estado === 'Pagado') return `<span class="bg-[#10B981]/20 text-[#10B981] px-2 py-1 text-xs font-bold border border-[#10B981]">PAGADO</span>`;
        return `<span class="bg-yellow-500/20 text-yellow-500 px-2 py-1 text-xs font-bold border border-yellow-500">PENDIENTE</span>`;
      }
    },
    { 
      title: "Acciones", width: 180, hozAlign: "center",
      formatter: (cell) => {
        if (cell.getRow().getData().Estado === 'Pagado') return `<span class="text-gray-500 text-xs italic">Completado</span>`;
        return `
          <div class="flex gap-2 justify-center">
            <button class="btn-editar bg-slate-700 text-white px-3 py-1 text-xs font-bold border-2 border-transparent hover:border-brillo-primario transition-all cursor-pointer">Editar</button>
            <button class="btn-pagar bg-acento-neobrutal text-slate-900 px-3 py-1 text-xs font-black border-2 border-transparent hover:border-white transition-all cursor-pointer">Pagar</button>
          </div>
        `;
      },
      cellClick: (e, cell) => {
        if (e.target.classList.contains('btn-pagar')) handlePagarCuota(e, cell);
        if (e.target.classList.contains('btn-editar')) abrirModalEditar(e, cell);
      } 
    }
  ];

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Mis Cuotas</h1>
        <p className="text-gray-400 text-lg mt-2">Controla tus fraccionamientos, ajusta precios y registra tus pagos.</p>
      </header>

      <div className="bg-slate-900 border-2 border-gray-700 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-1">
        <ReactTabulator
          onRef={(r) => (tableRef.current = r)}
          data={cuotas}
          columns={columns}
          layout={"fitDataStretch"}
          options={{ pagination: "local", paginationSize: 15 }}
        />
      </div>

      {isEditModalOpen && cuotaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-4 border-brillo-primario p-8 max-w-sm w-full shadow-[12px_12px_0px_0px_rgba(139,92,246,1)] relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-2xl font-extrabold text-white mb-2 uppercase tracking-tight">Ajustar Precio</h2>
            <p className="text-gray-400 text-sm mb-6 font-bold">Modificando: "{cuotaEditando.Comercio}".</p>
            <form onSubmit={guardarNuevoMonto} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Nuevo Monto (S/)</label>
                <input type="number" step="0.01" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} className="w-full bg-slate-800 border-2 border-brillo-primario text-white px-4 py-3 outline-none text-2xl font-black text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] focus:shadow-[4px_4px_0px_0px_rgba(139,92,246,1)]" required />
              </div>
              <button type="submit" disabled={loading} className="mt-4 w-full bg-brillo-primario text-white font-extrabold text-lg py-4 border-4 border-transparent hover:border-white hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}   