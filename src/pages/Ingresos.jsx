import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import Layout from '../components/Layout';
import { apiIngresos } from '../services/api';

export default function Ingresos() {
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Función auxiliar para formatear la fecha
  const formatFecha = (valor) => {
    if (!valor) return "";
    const fecha = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
    return isNaN(fecha) ? valor : fecha.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // --- CONFIGURACIÓN DE TANSTACK TABLE ---
  const columns = useMemo(() => [
    { 
      accessorKey: 'FechaOperacion', 
      header: 'Fecha',
      cell: (info) => <span className="text-gray-300">{formatFecha(info.getValue())}</span>
    },
    { 
      accessorKey: 'Descripcion', 
      header: 'Descripción / Concepto',
      cell: (info) => <span className="font-bold text-white">{info.getValue()}</span>
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
    }
  ], []);

  const table = useReactTable({
    data: ingresos,
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
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Mis Ingresos</h1>
          <div className="flex items-center gap-2 mt-2">
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="bg-slate-800 border-2 border-brillo-primario text-white px-2 py-1 font-bold outline-none cursor-pointer">
              <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option>
              <option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option>
              <option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option>
              <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
            </select>
            <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="bg-slate-800 border-2 border-brillo-primario text-white px-2 py-1 font-bold outline-none cursor-pointer">
              <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
            </select>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-brillo-primario text-white font-extrabold px-6 py-3 border-4 border-transparent hover:border-white transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1">
          + NUEVO INGRESO
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
              {table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id}
                  className="border-b border-gray-800 hover:bg-slate-800 transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-4 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500 font-bold uppercase">
                    No hay ingresos en este periodo
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

      {/* --- MODAL NUEVO INGRESO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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