import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import Layout from '../components/Layout';
import { apiCuotas } from '../services/api';
import {
  Icon, PageHeader, Segmented, Modal, Field, AmountInput, EmptyState, ListSkeleton, Pagination, Spinner, StatCard,
} from '../components/ui';
import { formatMonto, formatFecha } from '../lib/format';

const esPagada = (cuota) => cuota.Estado === 'Pagado';

function EstadoBadge({ cuota }) {
  return esPagada(cuota) ? (
    <span className="badge border-positive/20 bg-positive/10 text-positive"><Icon name="check" size={12} strokeWidth={2.5} /> Pagada</span>
  ) : (
    <span className="badge border-warning/20 bg-warning/10 text-warning"><Icon name="clock" size={12} /> Pendiente</span>
  );
}

export default function Cuotas() {
  const [cuotas, setCuotas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('pendientes');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cuotaEditando, setCuotaEditando] = useState(null);
  const [nuevoMonto, setNuevoMonto] = useState('');

  const [cuotaPorPagar, setCuotaPorPagar] = useState(null);
  const [pagando, setPagando] = useState(false);

  const fetchCuotas = async () => {
    const userId = localStorage.getItem('userId');
    try {
      const response = await apiCuotas.get(`/cuotas?userId=${userId}`);
      if (response.data.Success) setCuotas(response.data.Cuotas);
    } catch (error) {
      console.error("Error cargando cuotas:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchCuotas();
  }, []);

  // --- PAGAR CUOTA (con confirmación) ---
  const confirmarPago = async () => {
    setPagando(true);
    try {
      // La Lambda ya creó el gasto futuro: solo se cambia su estado a Pagado
      const response = await apiCuotas.put('/cuotas', {
        UserId: localStorage.getItem('userId'),
        FechaOperacion: cuotaPorPagar.FechaOperacion, // Llave para DynamoDB
        Estado: 'Pagado'
      });
      if (response.data.Success) {
        setCuotaPorPagar(null);
        fetchCuotas();
      }
    } catch (error) {
      console.error("Error al pagar la cuota:", error);
    } finally {
      setPagando(false);
    }
  };

  // --- EDITAR MONTO ---
  const abrirModalEditar = (cuota) => {
    if (esPagada(cuota)) return;
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
        FechaOperacion: cuotaEditando.FechaOperacion, // Llave para DynamoDB
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

  const resumen = useMemo(() => {
    const pendientes = cuotas.filter(c => !esPagada(c));
    return {
      pendientes: pendientes.length,
      pagadas: cuotas.length - pendientes.length,
      totalPendiente: pendientes.reduce((s, c) => s + (Number(c.Monto) || 0), 0),
      proxima: pendientes[0], // Ya vienen ordenadas por fecha de cobro
    };
  }, [cuotas]);

  const cuotasFiltradas = useMemo(() => cuotas.filter(c => {
    if (filtro === 'pendientes') return !esPagada(c);
    if (filtro === 'pagadas') return esPagada(c);
    return true;
  }), [cuotas, filtro]);

  // --- TANSTACK TABLE ---
  const columns = useMemo(() => [
    {
      accessorKey: 'Comercio',
      header: 'Detalle',
      cell: (info) => <span className="font-medium text-ink">{info.getValue()}</span>
    },
    {
      accessorKey: 'FechaOperacion',
      header: 'Fecha de cobro',
      cell: (info) => <span className="text-muted num">{formatFecha(info.getValue())}</span>
    },
    {
      accessorKey: 'Estado',
      header: 'Estado',
      cell: (info) => <EstadoBadge cuota={info.row.original} />
    },
    {
      accessorKey: 'Monto',
      header: () => <div className="text-right">Monto</div>,
      cell: (info) => <div className="text-right font-medium text-ink num">{formatMonto(info.getValue())}</div>
    },
    {
      id: 'Acciones',
      header: () => <div className="text-right">Acciones</div>,
      cell: (info) => {
        const cuota = info.row.original;
        if (esPagada(cuota)) return <div className="text-right text-xs text-faint">—</div>;
        return (
          <div className="flex justify-end gap-2">
            <button onClick={() => abrirModalEditar(cuota)} className="btn-ghost h-9 px-3"><Icon name="edit" size={15} /> Editar</button>
            <button onClick={() => setCuotaPorPagar(cuota)} className="btn-primary h-9 px-3.5"><Icon name="check" size={15} strokeWidth={2.25} /> Pagar</button>
          </div>
        );
      }
    }
  ], []);

  const table = useReactTable({
    data: cuotasFiltradas,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const filas = table.getRowModel().rows;

  return (
    <Layout>
      <PageHeader
        eyebrow="Fraccionamientos"
        title="Cuotas"
        subtitle="Ajusta montos y registra el pago de cada cuota cuando se cobre."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard label="Por pagar" value={formatMonto(resumen.totalPendiente)} icon="clock" tone="neutral" className="col-span-2 md:col-span-1" />
        <StatCard label="Pendientes" value={resumen.pendientes} icon="card" style={{ animationDelay: '40ms' }} />
        <StatCard label="Pagadas" value={resumen.pagadas} icon="check" tone="positive" style={{ animationDelay: '80ms' }} />
      </div>

      {resumen.proxima && (
        <div className="mb-4 flex items-center gap-4 rounded-2xl border border-accent/20 bg-accent/[0.06] p-4 animate-fade-up">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-canvas"><Icon name="clock" size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">Próximo cobro · {formatFecha(resumen.proxima.FechaOperacion)}</p>
            <p className="truncate text-sm font-medium text-ink">{resumen.proxima.Comercio}</p>
          </div>
          <span className="text-[15px] font-medium text-ink num">{formatMonto(resumen.proxima.Monto)}</span>
        </div>
      )}

      <Segmented
        className="mb-4"
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'pendientes', label: 'Pendientes', count: resumen.pendientes },
          { value: 'pagadas', label: 'Pagadas', count: resumen.pagadas },
          { value: 'todas', label: 'Todas', count: cuotas.length },
        ]}
      />

      <section className="card overflow-hidden animate-fade-up" style={{ animationDelay: '60ms' }}>
        {cargando ? (
          <ListSkeleton />
        ) : filas.length === 0 ? (
          <EmptyState
            icon="card"
            title={filtro === 'pendientes' ? 'Todo al día' : 'Sin cuotas'}
            description={filtro === 'pendientes' ? 'No tienes cuotas pendientes de pago.' : 'Fracciona un gasto desde la sección Gastos para verlo aquí.'}
          />
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {filas.map(row => {
                const c = row.original;
                return (
                  <li key={row.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-ink">{c.Comercio}</p>
                        <p className="mt-0.5 text-xs text-faint">{formatFecha(c.FechaOperacion)}</p>
                      </div>
                      <span className="text-[15px] font-medium text-ink num">{formatMonto(c.Monto)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <EstadoBadge cuota={c} />
                      {!esPagada(c) && (
                        <div className="flex gap-2">
                          <button onClick={() => abrirModalEditar(c)} className="btn-secondary h-9 px-3 text-[13px]"><Icon name="edit" size={14} /> Editar</button>
                          <button onClick={() => setCuotaPorPagar(c)} className="btn-primary h-9 px-3.5 text-[13px]"><Icon name="check" size={14} strokeWidth={2.25} /> Pagar</button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
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
                    <tr key={row.id} className={`hover:bg-white/[0.025] ${esPagada(row.original) ? 'opacity-60' : ''}`}>
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

      {/* --- CONFIRMAR PAGO --- */}
      <Modal open={!!cuotaPorPagar} onClose={() => setCuotaPorPagar(null)} title="Confirmar pago" subtitle={cuotaPorPagar?.Comercio} size="sm">
        {cuotaPorPagar && (
          <>
            <div className="mb-6 rounded-2xl border border-line bg-canvas p-5 text-center">
              <p className="eyebrow">Monto de la cuota</p>
              <p className="mt-2 text-4xl font-medium tracking-tight text-ink num">{formatMonto(cuotaPorPagar.Monto)}</p>
              <p className="mt-1.5 text-sm text-faint">Cobro del {formatFecha(cuotaPorPagar.FechaOperacion)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCuotaPorPagar(null)} className="btn-secondary h-12">Cancelar</button>
              <button onClick={confirmarPago} disabled={pagando} className="btn-primary h-12">
                {pagando ? <><Spinner /> Pagando…</> : 'Marcar pagada'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* --- EDITAR MONTO --- */}
      <Modal open={isEditModalOpen && !!cuotaEditando} onClose={() => setIsEditModalOpen(false)} title="Ajustar monto" subtitle={cuotaEditando?.Comercio} size="sm">
        <form onSubmit={guardarNuevoMonto} className="flex flex-col gap-5">
          <Field label="Nuevo monto">
            <AmountInput value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} autoFocus />
          </Field>
          <button type="submit" disabled={loading} className="btn-primary h-12 w-full">
            {loading ? <><Spinner /> Guardando…</> : 'Guardar cambio'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
