import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import Layout from '../components/Layout';
import { apiIngresos } from '../services/api';
import {
  Icon, PageHeader, PeriodPicker, Modal, Field, AmountInput, EmptyState, ListSkeleton, Pagination, Spinner,
} from '../components/ui';
import { formatMonto, formatFecha, periodoActual, periodoTexto } from '../lib/format';

function IconoIngreso() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-positive/10 text-positive">
      <Icon name="arrowDown" size={18} />
    </span>
  );
}

export default function Ingresos() {
  const [ingresos, setIngresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState(periodoActual);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');

  const fetchIngresos = async () => {
    const userId = localStorage.getItem('userId');
    try {
      const response = await apiIngresos.get(`/ingresos?userId=${userId}&mes=${periodoTexto(periodo)}`);
      if (response.data.Success) setIngresos(response.data.Ingresos);
    } catch (error) { console.error(error); } finally { setCargando(false); }
  };

  useEffect(() => {
    setCargando(true);
    fetchIngresos();
  }, [periodo]);

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

  const total = useMemo(() => ingresos.reduce((s, i) => s + (Number(i.Monto) || 0), 0), [ingresos]);

  // --- TANSTACK TABLE ---
  const columns = useMemo(() => [
    {
      accessorKey: 'Descripcion',
      header: 'Concepto',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <IconoIngreso />
          <span className="font-medium text-ink">{info.getValue()}</span>
        </div>
      )
    },
    {
      accessorKey: 'FechaOperacion',
      header: 'Fecha',
      cell: (info) => <span className="text-muted num">{formatFecha(info.getValue())}</span>
    },
    {
      accessorKey: 'Monto',
      header: () => <div className="text-right">Monto</div>,
      cell: (info) => <div className="text-right font-medium text-positive num">+ {formatMonto(info.getValue())}</div>
    }
  ], []);

  const table = useReactTable({
    data: ingresos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  });

  const filas = table.getRowModel().rows;

  return (
    <Layout>
      <PageHeader
        eyebrow="Movimientos"
        title="Ingresos"
        actions={
          <>
            <PeriodPicker periodo={periodo} onChange={setPeriodo} />
            <button onClick={() => setIsModalOpen(true)} className="btn-primary w-11 px-0 md:w-auto md:px-4" aria-label="Nuevo ingreso">
              <Icon name="plus" size={18} /> <span className="hidden md:inline">Nuevo ingreso</span>
            </button>
          </>
        }
      />

      <div className="card relative mb-4 overflow-hidden p-5 md:p-6 animate-fade-up">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-positive/[0.07] blur-3xl" />
        <p className="eyebrow">Total del mes</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="text-4xl font-medium tracking-tighter text-ink num md:text-5xl">{formatMonto(total)}</p>
          <p className="pb-1 text-sm text-faint num">{ingresos.length} {ingresos.length === 1 ? 'ingreso' : 'ingresos'}</p>
        </div>
      </div>

      <section className="card overflow-hidden animate-fade-up" style={{ animationDelay: '60ms' }}>
        {cargando ? (
          <ListSkeleton rows={4} />
        ) : filas.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="Sin ingresos en este periodo"
            description="Registra tu sueldo u otros ingresos para ver tu balance real."
            action={<button onClick={() => setIsModalOpen(true)} className="btn-secondary"><Icon name="plus" size={16} /> Registrar ingreso</button>}
          />
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {filas.map(row => (
                <li key={row.id} className="flex items-center gap-3.5 px-4 py-3.5">
                  <IconoIngreso />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">{row.original.Descripcion}</p>
                    <p className="mt-0.5 text-xs text-faint">{formatFecha(row.original.FechaOperacion)}</p>
                  </div>
                  <span className="text-[15px] font-medium text-positive num">+ {formatMonto(row.original.Monto)}</span>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="table-modern">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {filas.map(row => (
                    <tr key={row.id} className="hover:bg-white/[0.025]">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination table={table} />
          </>
        )}
      </section>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo ingreso" subtitle="Sueldo, ventas, transferencias recibidas…">
        <form onSubmit={handleCrearIngreso} className="flex flex-col gap-5">
          <Field label="Monto">
            <AmountInput value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} />
          </Field>
          <Field label="Descripción">
            <input type="text" value={nuevaDescripcion} onChange={(e) => setNuevaDescripcion(e.target.value)} className="input" placeholder="Ej. Sueldo" required />
          </Field>
          <button type="submit" disabled={loading} className="btn-primary mt-1 h-12 w-full">
            {loading ? <><Spinner /> Guardando…</> : 'Guardar ingreso'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
