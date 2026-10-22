import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import Layout from '../components/Layout';
import { apiGastos, apiCuotas } from '../services/api';
import {
  Icon, PageHeader, PeriodPicker, Segmented, Modal, Field, AmountInput, Avatar, EmptyState,
  ListSkeleton, Pagination, Spinner,
} from '../components/ui';
import { formatMonto, formatFecha, formatHora, periodoActual, periodoTexto } from '../lib/format';

const CATEGORIAS = ['Comida', 'Transporte', 'Servicios', 'Hogar', 'Entretenimiento', 'Salud', 'Tecnología', 'Otros'];

const esReferencia = (gasto) => gasto.EsGastoReferencia || gasto.EsPagoDeCuota;

function EstadoBadge({ gasto }) {
  if (gasto.EsPagoDeCuota) return <span className="badge border-line text-faint"><Icon name="card" size={12} /> Cuota</span>;
  if (gasto.EsGastoReferencia) return <span className="badge border-line text-faint"><Icon name="split" size={12} /> Fraccionado</span>;
  return null;
}

function Monto({ gasto, className = '' }) {
  return (
    <span className={`font-medium num ${gasto.Moneda === 'USD' ? 'text-positive' : 'text-ink'} ${className}`}>
      {formatMonto(gasto.Monto, gasto.Moneda)}
    </span>
  );
}

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState(periodoActual);

  // Buscador y pestañas
  const [globalFilter, setGlobalFilter] = useState('');
  const [tipoVista, setTipoVista] = useState('reales'); // 'todos', 'reales', 'referencias'

  // Modal de nuevo gasto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Comida');
  const [nuevoComercio, setNuevoComercio] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [tasaManual, setTasaManual] = useState(3.75);

  // Modal de detalle
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [gastoDetalle, setGastoDetalle] = useState(null);

  // Modal de fraccionar
  const [isFraccionarModalOpen, setIsFraccionarModalOpen] = useState(false);
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [cantidadCuotas, setCantidadCuotas] = useState('');
  const [fraccionarLoading, setFraccionarLoading] = useState(false);

  const fetchGastos = async () => {
    const userId = localStorage.getItem('userId');
    try {
      const response = await apiGastos.get(`/gastos?userId=${userId}&mes=${periodoTexto(periodo)}`);
      if (response.data.Success) setGastos(response.data.Gastos);
    } catch (error) {
      console.error("Error cargando gastos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    setCargando(true);
    fetchGastos();

    // Tipo de cambio del día, sugerido al registrar gastos en dólares
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => { if (data?.rates?.PEN) setTasaManual(data.rates.PEN); })
      .catch(err => console.error("Error obteniendo tipo de cambio:", err));
  }, [periodo]);

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
        setMoneda('PEN');
        fetchGastos();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalle = (gasto) => {
    setGastoDetalle(gasto);
    setIsDetalleModalOpen(true);
  };

  const abrirModalFraccionar = (gasto) => {
    setIsDetalleModalOpen(false);
    setGastoSeleccionado(gasto);
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

  // 1. Filtrar según la pestaña seleccionada
  const conteo = useMemo(() => ({
    reales: gastos.filter(g => !esReferencia(g)).length,
    referencias: gastos.filter(esReferencia).length,
    todos: gastos.length,
  }), [gastos]);

  const gastosFiltradosPorVista = useMemo(() => gastos.filter(gasto => {
    if (tipoVista === 'reales') return !esReferencia(gasto);
    if (tipoVista === 'referencias') return esReferencia(gasto);
    return true;
  }), [gastos, tipoVista]);

  // --- TANSTACK TABLE ---
  const columns = useMemo(() => [
    {
      accessorKey: 'Comercio',
      header: 'Comercio',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <Avatar text={info.getValue()} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{info.getValue()}</p>
            {info.row.original.Banco && <p className="truncate text-xs text-faint">{info.row.original.Banco}</p>}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'Categoria',
      header: 'Categoría',
      cell: (info) => <span className="text-muted">{info.getValue()}</span>
    },
    {
      accessorKey: 'FechaOperacion',
      header: 'Fecha',
      cell: (info) => (
        <span className="text-muted num">
          {formatFecha(info.getValue())}
          <span className="ml-2 text-faint">{formatHora(info.getValue())}</span>
        </span>
      )
    },
    {
      id: 'Estado',
      header: 'Estado',
      cell: (info) => <EstadoBadge gasto={info.row.original} />
    },
    {
      accessorKey: 'Monto',
      header: () => <div className="text-right">Monto</div>,
      cell: (info) => <div className="text-right"><Monto gasto={info.row.original} /></div>
    },
  ], []);

  const table = useReactTable({
    data: gastosFiltradosPorVista,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  });

  // 2. Totales sobre las filas visibles (pestaña + buscador)
  const filasFiltradas = table.getFilteredRowModel().rows;
  const totales = useMemo(() => {
    let totalPEN = 0;
    let totalUSD = 0;
    filasFiltradas.forEach(row => {
      const monto = parseFloat(row.original.Monto);
      if (row.original.Moneda === 'USD') totalUSD += monto;
      else totalPEN += monto;
    });
    return { totalPEN, totalUSD };
  }, [filasFiltradas]);

  const filas = table.getRowModel().rows;

  return (
    <Layout>
      <PageHeader
        eyebrow="Movimientos"
        title="Gastos"
        actions={
          <>
            <PeriodPicker periodo={periodo} onChange={setPeriodo} />
            <button onClick={() => setIsModalOpen(true)} className="btn-primary w-11 px-0 md:w-auto md:px-4" aria-label="Nuevo gasto">
              <Icon name="plus" size={18} /> <span className="hidden md:inline">Nuevo gasto</span>
            </button>
          </>
        }
      />

      {/* --- TOTALES --- */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:gap-4 animate-fade-up">
        <div className="card p-4 md:p-5">
          <p className="eyebrow">Total en soles</p>
          <p className="mt-3 text-xl font-medium tracking-tight text-ink num md:text-2xl">{formatMonto(totales.totalPEN)}</p>
        </div>
        <div className="card p-4 md:p-5">
          <p className="eyebrow">Total en dólares</p>
          <p className="mt-3 text-xl font-medium tracking-tight text-positive num md:text-2xl">{formatMonto(totales.totalUSD, 'USD')}</p>
        </div>
      </div>

      {/* --- CONTROLES --- */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between animate-fade-up" style={{ animationDelay: '60ms' }}>
        <Segmented
          value={tipoVista}
          onChange={setTipoVista}
          options={[
            { value: 'reales', label: 'Reales', count: conteo.reales },
            { value: 'referencias', label: 'Cuotas', count: conteo.referencias },
            { value: 'todos', label: 'Todos', count: conteo.todos },
          ]}
        />
        <div className="relative md:w-80">
          <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            placeholder="Buscar comercio o categoría"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="input h-11 pl-11 pr-10"
          />
          {globalFilter && (
            <button onClick={() => setGlobalFilter('')} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-faint hover:bg-white/10 hover:text-ink" aria-label="Limpiar búsqueda">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* --- LISTA --- */}
      <section className="card overflow-hidden animate-fade-up" style={{ animationDelay: '120ms' }}>
        {cargando ? (
          <ListSkeleton />
        ) : filas.length === 0 ? (
          <EmptyState
            icon="receipt"
            title={globalFilter ? 'Sin resultados' : 'Sin gastos en este periodo'}
            description={globalFilter ? `No encontramos nada para "${globalFilter}".` : 'Los gastos de tus correos aparecerán aquí automáticamente.'}
          />
        ) : (
          <>
            {/* Celular: lista */}
            <ul className="divide-y divide-line md:hidden">
              {filas.map(row => {
                const g = row.original;
                return (
                  <li key={row.id}>
                    <button onClick={() => abrirDetalle(g)} className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-white/[0.04] ${esReferencia(g) ? 'opacity-60' : ''}`}>
                      <Avatar text={g.Comercio} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-ink">{g.Comercio}</p>
                        <p className="mt-0.5 truncate text-xs text-faint">
                          {g.Categoria} · {formatFecha(g.FechaOperacion)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Monto gasto={g} className="text-[15px]" />
                        {esReferencia(g) && <span className="text-[11px] text-faint">{g.EsPagoDeCuota ? 'Cuota' : 'Fraccionado'}</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* PC: tabla */}
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
                    <tr
                      key={row.id}
                      onClick={() => abrirDetalle(row.original)}
                      className={`cursor-pointer hover:bg-white/[0.025] ${esReferencia(row.original) ? 'opacity-55 hover:opacity-90' : ''}`}
                    >
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

      {/* --- 1. DETALLE --- */}
      <Modal open={isDetalleModalOpen && !!gastoDetalle} onClose={() => setIsDetalleModalOpen(false)} title={gastoDetalle?.Comercio} subtitle={gastoDetalle?.Banco}>
        {gastoDetalle && (
          <>
            <div className="mb-5 rounded-2xl border border-line bg-canvas p-5 text-center">
              <p className="eyebrow">Monto</p>
              <p className={`mt-2 text-4xl font-medium tracking-tight num ${gastoDetalle.Moneda === 'USD' ? 'text-positive' : 'text-ink'}`}>
                {formatMonto(gastoDetalle.Monto, gastoDetalle.Moneda)}
              </p>
              {gastoDetalle.Moneda === 'USD' && gastoDetalle.MontoPEN > 0 && (
                <p className="mt-1.5 text-sm text-faint num">≈ {formatMonto(gastoDetalle.MontoPEN)} · TC {gastoDetalle.TipoCambio}</p>
              )}
            </div>

            <dl className="mb-6 divide-y divide-line rounded-2xl border border-line">
              {[
                ['Fecha', `${formatFecha(gastoDetalle.FechaOperacion)} ${formatHora(gastoDetalle.FechaOperacion)}`],
                ['Categoría', gastoDetalle.Categoria],
                ['Estado', gastoDetalle.EsPagoDeCuota ? 'Cuota' : gastoDetalle.EsGastoReferencia ? 'Fraccionado' : 'Gasto normal'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-faint">{k}</dt>
                  <dd className="text-right text-ink num">{v}</dd>
                </div>
              ))}
            </dl>

            {!esReferencia(gastoDetalle) ? (
              <button onClick={() => abrirModalFraccionar(gastoDetalle)} className="btn-primary h-12 w-full">
                <Icon name="split" size={18} /> Fraccionar en cuotas
              </button>
            ) : (
              <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-center text-sm text-muted">
                {gastoDetalle.EsPagoDeCuota ? 'Este gasto es una cuota.' : 'Este gasto ya fue fraccionado.'}
              </p>
            )}
          </>
        )}
      </Modal>

      {/* --- 2. NUEVO GASTO --- */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo gasto" subtitle="Registra un gasto que no llegó por correo.">
        <form onSubmit={handleCrearGasto} className="flex flex-col gap-5">
          <div>
            <span className="label">Moneda</span>
            <Segmented
              value={moneda}
              onChange={setMoneda}
              options={[{ value: 'PEN', label: 'Soles (S/)' }, { value: 'USD', label: 'Dólares ($)' }]}
            />
          </div>

          <Field label="Monto">
            <AmountInput value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} moneda={moneda} />
          </Field>

          {moneda === 'USD' && (
            <Field label="Tipo de cambio" hint="Sugerido según el mercado de hoy. Puedes ajustarlo.">
              <input type="number" inputMode="decimal" step="0.001" value={tasaManual} onChange={(e) => setTasaManual(e.target.value)} className="input num" required />
            </Field>
          )}

          <Field label="Comercio">
            <input type="text" value={nuevoComercio} onChange={(e) => setNuevoComercio(e.target.value)} className="input" placeholder="Ej. Supermercado" required />
          </Field>

          <Field label="Categoría">
            <select value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} className="input">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <button type="submit" disabled={loading} className="btn-primary mt-1 h-12 w-full">
            {loading ? <><Spinner /> Guardando…</> : 'Guardar gasto'}
          </button>
        </form>
      </Modal>

      {/* --- 3. FRACCIONAR --- */}
      <Modal
        open={isFraccionarModalOpen && !!gastoSeleccionado}
        onClose={() => setIsFraccionarModalOpen(false)}
        title="Fraccionar"
        subtitle={gastoSeleccionado && `${gastoSeleccionado.Comercio} · ${formatMonto(gastoSeleccionado.Monto, gastoSeleccionado.Moneda)}`}
        size="sm"
      >
        {gastoSeleccionado && (
          <form onSubmit={confirmarFraccionamiento} className="flex flex-col gap-5">
            <Field label="¿En cuántas cuotas?">
              <div className="grid grid-cols-4 gap-2">
                {[3, 6, 12, 24].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCantidadCuotas(String(n))}
                    className={`h-11 rounded-xl border text-sm font-medium transition-colors num ${String(n) === cantidadCuotas ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:border-line-strong'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input type="number" inputMode="numeric" min="2" max="36" value={cantidadCuotas} onChange={(e) => setCantidadCuotas(e.target.value)} className="input mt-2 text-center num" placeholder="Otra cantidad (2 – 36)" required />
            </Field>

            {Number(cantidadCuotas) >= 2 && (
              <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 text-sm animate-fade-in">
                <span className="text-muted">Cuota mensual aprox.</span>
                <span className="font-medium text-ink num">{formatMonto(gastoSeleccionado.Monto / Number(cantidadCuotas), gastoSeleccionado.Moneda)}</span>
              </div>
            )}

            <button type="submit" disabled={fraccionarLoading} className="btn-primary h-12 w-full">
              {fraccionarLoading ? <><Spinner /> Procesando…</> : 'Confirmar cuotas'}
            </button>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
