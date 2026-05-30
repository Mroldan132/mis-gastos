import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import Layout from '../components/Layout';
import { apiCuotas } from '../services/api';

export default function Cuotas() {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(false);

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
  const handlePagarCuota = async (cuota) => {
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
  const abrirModalEditar = (cuota) => {
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

  // Función auxiliar para formatear la fecha
  const formatFecha = (valor) => {
    if (!valor) return "";
    const fecha = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
    return isNaN(fecha) ? valor : fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // --- CONFIGURACIÓN DE TANSTACK TABLE ---
  const columns = useMemo(() => [
    { 
      accessorKey: 'Comercio', 
      header: 'Detalle de Cuota',
      cell: (info) => <span className="font-bold text-white">{info.getValue()}</span>
    },
    { 
      accessorKey: 'FechaOperacion', 
      header: 'Fecha de Cobro',
      cell: (info) => <span className="text-gray-300">{formatFecha(info.getValue())}</span>
    },
    { 
      accessorKey: 'Monto', 
      header: () => <div className="text-right">Monto</div>,
      cell: (info) => {
        const monto = parseFloat(info.getValue());
        return (
          <div className="text-right w-full text-brillo-primario font-black text-sm">
            S/ {monto.toFixed(2)}
          </div>
        );
      }
    },
    { 
      accessorKey: 'Estado',
      header: () => <div className="text-center">Estado</div>,
      cell: (info) => {
        const estado = info.getValue();
        return (
          <div className="text-center">
            {estado === 'Pagado' ? (
              <span className="bg-[#10B981]/20 text-[#10B981] px-2 py-1 text-xs font-bold border border-[#10B981]">PAGADO</span>
            ) : (
              <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 text-xs font-bold border border-yellow-500">PENDIENTE</span>
            )}
          </div>
        );
      }
    },
    { 
      id: 'Acciones',
      header: () => <div className="text-center">Acciones</div>,
      cell: (info) => {
        const cuota = info.row.original;
        
        if (cuota.Estado === 'Pagado') {
          return <div className="text-center text-gray-500 text-xs italic">Completado</div>;
        }
        
        return (
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => abrirModalEditar(cuota)}
              className="bg-slate-700 text-white px-3 py-1 text-xs font-bold border-2 border-transparent hover:border-brillo-primario transition-all cursor-pointer"
            >
              Editar
            </button>
            <button 
              onClick={() => handlePagarCuota(cuota)}
              className="bg-acento-neobrutal text-slate-900 px-3 py-1 text-xs font-black border-2 border-transparent hover:border-white transition-all cursor-pointer"
            >
              Pagar
            </button>
          </div>
        );
      }
    }
  ], []);

  const table = useReactTable({
    data: cuotas,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Mis Cuotas</h1>
        <p className="text-gray-400 text-lg mt-2">Controla tus fraccionamientos, ajusta precios y registra tus pagos.</p>
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
              {table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id}
                  className="border-b border-gray-800 hover:bg-slate-800 transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-4 text-sm align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500 font-bold uppercase">
                    No hay cuotas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINACIÓN */}
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

      {/* --- MODAL EDITAR MONTO --- */}
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