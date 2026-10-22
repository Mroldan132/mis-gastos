import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import Layout from '../components/Layout';
import { apiGastos, apiCuotas, mensajeDeError } from '../services/api';
import {
  Icon, PageHeader, PeriodPicker, Segmented, Modal, Field, AmountInput, Avatar, EmptyState,
  ListSkeleton, Pagination, Spinner,
} from '../components/ui';
import {
  formatMonto, formatFecha, formatHora, periodoActual, periodoTexto, nombreMes, hoyISO,
  unirCategorias, esReferencia, leidoPorIA, porRevisar, exportarGastosCSV,
} from '../lib/format';

const COMPARTIDO_OPCIONES = [
  { value: 'auto', label: 'Según categoría' },
  { value: 'si', label: 'Compartido' },
  { value: 'no', label: 'Personal' },
];
const compartidoDe = (gasto) => (gasto.EsCompartido === true ? 'si' : gasto.EsCompartido === false ? 'no' : 'auto');

function EstadoBadge({ gasto }) {
  if (gasto.EsPagoDeCuota) return <span className="badge border-line text-faint"><Icon name="card" size={12} /> Cuota</span>;
  if (gasto.EsGastoReferencia) return <span className="badge border-line text-faint"><Icon name="split" size={12} /> Fraccionado</span>;
  if (porRevisar(gasto)) return <span className="badge border-accent/25 bg-accent/10 text-accent"><Icon name="sparkle" size={12} /> Por revisar</span>;
  if (gasto.EsCompartido) return <span className="badge border-line text-muted"><Icon name="users" size={12} /> Compartido</span>;
  return null;
}

function Monto({ gasto, className = '' }) {
  return (
    <span className={`font-medium num ${gasto.Moneda === 'USD' ? 'text-positive' : 'text-ink'} ${className}`}>
      {formatMonto(gasto.Monto, gasto.Moneda)}
    </span>
  );
}

function FilaCelular({ gasto, onClick }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-white/[0.04] md:px-5 md:hover:bg-white/[0.025] ${esReferencia(gasto) ? 'opacity-60' : ''}`}>
      <div className="relative">
        <Avatar text={gasto.Comercio} />
        {porRevisar(gasto) && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{gasto.Comercio}</p>
        <p className="mt-0.5 truncate text-xs text-faint">
          {gasto.Categoria} · {formatFecha(gasto.FechaOperacion)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Monto gasto={gasto} className="text-[15px]" />
        {esReferencia(gasto) && <span className="text-[11px] text-faint">{gasto.EsPagoDeCuota ? 'Cuota' : 'Fraccionado'}</span>}
        {!esReferencia(gasto) && gasto.EsCompartido && <Icon name="users" size={13} className="text-faint" />}
      </div>
    </button>
  );
}

export default function Gastos() {
  const [searchParams] = useSearchParams();
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState(periodoActual);

  // Buscador y pestañas
  const [globalFilter, setGlobalFilter] = useState('');
  const [tipoVista, setTipoVista] = useState(searchParams.get('vista') === 'revisar' ? 'revisar' : 'reales');

  // Búsqueda en todo el historial
  const [historial, setHistorial] = useState(null); // null = viendo el mes
  const [buscandoHistorial, setBuscandoHistorial] = useState(false);

  // Modal de nuevo gasto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Comida');
  const [nuevoComercio, setNuevoComercio] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState(hoyISO);
  const [nuevoCompartido, setNuevoCompartido] = useState('auto');
  const [moneda, setMoneda] = useState('PEN');
  const [tasaManual, setTasaManual] = useState(3.75);
  const [textoRapido, setTextoRapido] = useState('');
  const [interpretando, setInterpretando] = useState(false);
  const [desdeTexto, setDesdeTexto] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState('');

  // Modal de detalle (ver, editar, eliminar)
  const [gastoDetalle, setGastoDetalle] = useState(null);
  const [modoDetalle, setModoDetalle] = useState('ver'); // 'ver' | 'editar' | 'eliminar'
  const [edicion, setEdicion] = useState({});
  const [guardandoDetalle, setGuardandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');

  // Modal de fraccionar
  const [isFraccionarModalOpen, setIsFraccionarModalOpen] = useState(false);
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [cantidadCuotas, setCantidadCuotas] = useState('');
  const [fraccionarLoading, setFraccionarLoading] = useState(false);

  const mes = periodoTexto(periodo);

  const fetchGastos = async () => {
    try {
      const response = await apiGastos.get(`/gastos?mes=${mes}`);
      if (response.data.Success) setGastos(response.data.Gastos);
    } catch (error) {
      console.error("Error cargando gastos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    setCargando(true);
    setHistorial(null);
    fetchGastos();

    // Tipo de cambio del día, sugerido al registrar gastos en dólares
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => { if (data?.rates?.PEN) setTasaManual(data.rates.PEN); })
      .catch(err => console.error("Error obteniendo tipo de cambio:", err));
  }, [periodo]);

  const categorias = useMemo(() => unirCategorias(gastos.map(g => g.Categoria)), [gastos]);

  // --- NUEVO GASTO ---
  const abrirNuevo = () => {
    setNuevoMonto(''); setNuevoComercio(''); setMoneda('PEN'); setNuevaCategoria('Comida');
    setNuevaFecha(hoyISO()); setNuevoCompartido('auto'); setTextoRapido(''); setDesdeTexto(false); setErrorNuevo('');
    setIsModalOpen(true);
  };

  const interpretarTexto = async () => {
    if (!textoRapido.trim()) return;
    setInterpretando(true);
    setErrorNuevo('');
    try {
      const { data } = await apiGastos.post('/gastos/texto', { Texto: textoRapido });
      const s = data.Sugerencia;
      setNuevoComercio(s.Comercio || '');
      setNuevoMonto(String(s.Monto ?? ''));
      setMoneda(s.Moneda === 'USD' ? 'USD' : 'PEN');
      setNuevaCategoria(s.Categoria || 'Otros');
      if (s.Fecha) setNuevaFecha(s.Fecha);
      setDesdeTexto(true);
    } catch (error) {
      setErrorNuevo(mensajeDeError(error, 'No pudimos interpretar la frase.'));
    } finally {
      setInterpretando(false);
    }
  };

  const handleCrearGasto = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorNuevo('');
    try {
      const response = await apiGastos.post('/gastos', {
        Monto: parseFloat(nuevoMonto),
        Categoria: nuevaCategoria,
        Comercio: nuevoComercio,
        Fecha: nuevaFecha,
        EsPagoDeCuota: false,
        CuotaIdRelacionada: "",
        Moneda: moneda,
        TipoCambio: moneda === 'USD' ? parseFloat(tasaManual) : 1,
        Origen: desdeTexto ? 'Texto' : 'Manual',
        Compartido: nuevoCompartido,
      });

      if (response.data.Success) {
        setIsModalOpen(false);
        fetchGastos();
      }
    } catch (error) {
      setErrorNuevo(mensajeDeError(error));
    } finally {
      setLoading(false);
    }
  };

  // --- DETALLE: VER, EDITAR, ELIMINAR ---
  const abrirDetalle = (gasto) => {
    setGastoDetalle(gasto);
    setModoDetalle('ver');
    setErrorDetalle('');
  };
  const cerrarDetalle = () => setGastoDetalle(null);

  const iniciarEdicion = () => {
    setEdicion({
      Comercio: gastoDetalle.Comercio || '',
      Categoria: gastoDetalle.Categoria || '',
      Monto: String(gastoDetalle.Monto ?? ''),
      Moneda: gastoDetalle.Moneda || 'PEN',
    });
    setModoDetalle('editar');
    setErrorDetalle('');
  };

  // Aplica un cambio al gasto abierto y refresca la lista
  const actualizarGasto = async (cambios) => {
    setGuardandoDetalle(true);
    setErrorDetalle('');
    try {
      const { data } = await apiGastos.put('/gastos', { FechaOperacion: gastoDetalle.FechaOperacion, ...cambios });
      setGastoDetalle(data.Gasto);
      setModoDetalle('ver');
      setGastos(lista => lista.map(g => (g.FechaOperacion === data.Gasto.FechaOperacion ? data.Gasto : g)));
      setHistorial(lista => lista && lista.map(g => (g.FechaOperacion === data.Gasto.FechaOperacion ? data.Gasto : g)));
    } catch (error) {
      setErrorDetalle(mensajeDeError(error));
    } finally {
      setGuardandoDetalle(false);
    }
  };

  const guardarEdicion = (e) => {
    e.preventDefault();
    const cambios = { Comercio: edicion.Comercio, Categoria: edicion.Categoria };
    if (!esReferencia(gastoDetalle)) {
      cambios.Monto = parseFloat(edicion.Monto);
      cambios.Moneda = edicion.Moneda;
    }
    actualizarGasto(cambios);
  };

  const eliminarGasto = async () => {
    setGuardandoDetalle(true);
    setErrorDetalle('');
    try {
      await apiGastos.delete(`/gastos?fechaOperacion=${encodeURIComponent(gastoDetalle.FechaOperacion)}`);
      setGastos(lista => lista.filter(g => g.FechaOperacion !== gastoDetalle.FechaOperacion));
      setHistorial(lista => lista && lista.filter(g => g.FechaOperacion !== gastoDetalle.FechaOperacion));
      cerrarDetalle();
    } catch (error) {
      setErrorDetalle(mensajeDeError(error));
    } finally {
      setGuardandoDetalle(false);
    }
  };

  // --- FRACCIONAR ---
  const abrirModalFraccionar = (gasto) => {
    cerrarDetalle();
    setGastoSeleccionado(gasto);
    setCantidadCuotas('');
    setIsFraccionarModalOpen(true);
  };

  const confirmarFraccionamiento = async (e) => {
    e.preventDefault();
    setFraccionarLoading(true);
    try {
      const response = await apiCuotas.post('/cuotas', {
        FechaOperacionOriginal: gastoSeleccionado.FechaOperacion,
        CantidadCuotas: parseInt(cantidadCuotas)
      });
      if (response.data.Success) {
        setIsFraccionarModalOpen(false);
        fetchGastos();
      }
    } catch (error) { console.error(error); } finally { setFraccionarLoading(false); }
  };

  // --- BÚSQUEDA EN TODO EL HISTORIAL ---
  const buscarEnHistorial = async () => {
    setBuscandoHistorial(true);
    try {
      const { data } = await apiGastos.get(`/gastos?buscar=${encodeURIComponent(globalFilter.trim())}`);
      setHistorial(data.Gastos || []);
    } catch (error) {
      console.error(error);
    } finally {
      setBuscandoHistorial(false);
    }
  };

  // 1. Filtrar según la pestaña seleccionada
  const conteo = useMemo(() => ({
    reales: gastos.filter(g => !esReferencia(g)).length,
    revisar: gastos.filter(porRevisar).length,
    referencias: gastos.filter(esReferencia).length,
    todos: gastos.length,
  }), [gastos]);

  const gastosFiltradosPorVista = useMemo(() => gastos.filter(gasto => {
    if (tipoVista === 'reales') return !esReferencia(gasto);
    if (tipoVista === 'revisar') return porRevisar(gasto);
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
          <div className="relative">
            <Avatar text={info.getValue()} />
            {porRevisar(info.row.original) && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />}
          </div>
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
  const esEditableMonto = gastoDetalle && !esReferencia(gastoDetalle);

  return (
    <Layout>
      <PageHeader
        eyebrow="Movimientos"
        title="Gastos"
        actions={
          <>
            <PeriodPicker periodo={periodo} onChange={setPeriodo} />
            <button onClick={() => exportarGastosCSV(filasFiltradas.map(r => r.original), mes)} disabled={!filasFiltradas.length} className="btn-secondary w-11 px-0 md:w-auto md:px-4" aria-label="Exportar a Excel">
              <Icon name="download" size={18} /> <span className="hidden md:inline">Exportar</span>
            </button>
            <button onClick={abrirNuevo} className="btn-primary w-11 px-0 md:w-auto md:px-4" aria-label="Nuevo gasto">
              <Icon name="plus" size={18} /> <span className="hidden md:inline">Nuevo gasto</span>
            </button>
          </>
        }
      />

      {/* --- AVISO DE GASTOS POR REVISAR --- */}
      {conteo.revisar > 0 && tipoVista !== 'revisar' && !historial && (
        <button onClick={() => setTipoVista('revisar')} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-accent/20 bg-accent/[0.06] p-4 text-left animate-fade-up">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-canvas"><Icon name="sparkle" size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{conteo.revisar} {conteo.revisar === 1 ? 'gasto leído' : 'gastos leídos'} por la IA sin revisar</p>
            <p className="text-xs text-muted">Confírmalos o corrígelos para que tus totales sean exactos.</p>
          </div>
          <Icon name="chevronRight" size={18} className="text-muted" />
        </button>
      )}

      {/* --- TOTALES --- */}
      {!historial && (
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
      )}

      {/* --- CONTROLES --- */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between animate-fade-up" style={{ animationDelay: '60ms' }}>
        {!historial ? (
          <Segmented
            value={tipoVista}
            onChange={setTipoVista}
            options={[
              { value: 'reales', label: 'Reales', count: conteo.reales },
              ...(conteo.revisar > 0 ? [{ value: 'revisar', label: 'Por revisar', count: conteo.revisar }] : []),
              { value: 'referencias', label: 'Cuotas', count: conteo.referencias },
              { value: 'todos', label: 'Todos', count: conteo.todos },
            ]}
          />
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => setHistorial(null)} className="btn-secondary h-10 px-3"><Icon name="chevronLeft" size={16} /> {nombreMes(mes)}</button>
            <p className="text-sm text-muted"><span className="text-ink num">{historial.length}</span> resultados en todo tu historial</p>
          </div>
        )}
        <div className="relative md:w-80">
          <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            placeholder="Buscar comercio o categoría"
            value={globalFilter ?? ''}
            onChange={(e) => { setGlobalFilter(e.target.value); if (!e.target.value) setHistorial(null); }}
            onKeyDown={(e) => e.key === 'Enter' && globalFilter.trim() && buscarEnHistorial()}
            className="input h-11 pl-11 pr-10"
          />
          {globalFilter && (
            <button onClick={() => { setGlobalFilter(''); setHistorial(null); }} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-faint hover:bg-white/10 hover:text-ink" aria-label="Limpiar búsqueda">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      {globalFilter.trim().length >= 2 && !historial && (
        <button onClick={buscarEnHistorial} disabled={buscandoHistorial} className="btn-ghost mb-3 h-9 px-3 text-[13px] text-accent hover:text-accent">
          {buscandoHistorial ? <Spinner /> : <Icon name="search" size={15} />} Buscar “{globalFilter.trim()}” en todo el historial
        </button>
      )}

      {/* --- LISTA --- */}
      <section className="card overflow-hidden animate-fade-up" style={{ animationDelay: '120ms' }}>
        {historial ? (
          historial.length === 0 ? (
            <EmptyState icon="search" title="Sin resultados" description={`No hay gastos con "${globalFilter}" en tu historial.`} />
          ) : (
            <ul className="divide-y divide-line">
              {historial.map(g => (
                <li key={g.FechaOperacion}><FilaCelular gasto={g} onClick={() => abrirDetalle(g)} /></li>
              ))}
            </ul>
          )
        ) : cargando ? (
          <ListSkeleton />
        ) : filas.length === 0 ? (
          <EmptyState
            icon={tipoVista === 'revisar' ? 'check' : 'receipt'}
            title={globalFilter ? 'Sin resultados este mes' : tipoVista === 'revisar' ? 'Todo revisado' : 'Sin gastos en este periodo'}
            description={globalFilter ? 'Prueba buscando en todo el historial.' : tipoVista === 'revisar' ? 'No quedan gastos de la IA por confirmar.' : 'Los gastos de tus correos aparecerán aquí automáticamente.'}
          />
        ) : (
          <>
            {/* Celular: lista */}
            <ul className="divide-y divide-line md:hidden">
              {filas.map(row => (
                <li key={row.id}><FilaCelular gasto={row.original} onClick={() => abrirDetalle(row.original)} /></li>
              ))}
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

      {/* --- 1. DETALLE / EDITAR / ELIMINAR --- */}
      <Modal
        open={!!gastoDetalle}
        onClose={cerrarDetalle}
        title={modoDetalle === 'editar' ? 'Editar gasto' : modoDetalle === 'eliminar' ? '¿Eliminar gasto?' : gastoDetalle?.Comercio}
        subtitle={modoDetalle === 'ver' ? gastoDetalle?.Banco : gastoDetalle?.Comercio}
      >
        {gastoDetalle && modoDetalle === 'ver' && (
          <>
            {porRevisar(gastoDetalle) && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/[0.06] p-3.5 text-sm">
                <Icon name="sparkle" size={16} className="mt-0.5 text-accent" />
                <p className="text-muted">La IA leyó este gasto de un correo. Revisa que el monto y la categoría sean correctos.</p>
              </div>
            )}

            <div className="mb-4 rounded-2xl border border-line bg-canvas p-5 text-center">
              <p className="eyebrow">Monto</p>
              <p className={`mt-2 text-4xl font-medium tracking-tight num ${gastoDetalle.Moneda === 'USD' ? 'text-positive' : 'text-ink'}`}>
                {formatMonto(gastoDetalle.Monto, gastoDetalle.Moneda)}
              </p>
              {gastoDetalle.Moneda === 'USD' && gastoDetalle.MontoPEN > 0 && (
                <p className="mt-1.5 text-sm text-faint num">≈ {formatMonto(gastoDetalle.MontoPEN)} · TC {gastoDetalle.TipoCambio}</p>
              )}
            </div>

            <dl className="mb-4 divide-y divide-line rounded-2xl border border-line">
              {[
                ['Fecha', `${formatFecha(gastoDetalle.FechaOperacion)} ${formatHora(gastoDetalle.FechaOperacion)}`],
                ['Categoría', gastoDetalle.Categoria],
                ['Origen', leidoPorIA(gastoDetalle) ? 'Correo · leído por IA' : gastoDetalle.Origen === 'Fijo' ? 'Pago fijo' : gastoDetalle.Origen === 'Texto' ? 'Registro rápido' : 'Registro manual'],
                ['Estado', gastoDetalle.EsPagoDeCuota ? 'Cuota' : gastoDetalle.EsGastoReferencia ? 'Fraccionado' : 'Gasto normal'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-faint">{k}</dt>
                  <dd className="text-right text-ink num">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mb-5">
              <span className="label">En el hogar</span>
              <Segmented
                value={compartidoDe(gastoDetalle)}
                onChange={(v) => actualizarGasto({ Compartido: v, Revisado: gastoDetalle.Revisado })}
                options={COMPARTIDO_OPCIONES}
              />
            </div>

            {errorDetalle && <p className="mb-4 rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{errorDetalle}</p>}

            <div className="flex flex-col gap-2.5">
              {porRevisar(gastoDetalle) && (
                <button onClick={() => actualizarGasto({ Revisado: true })} disabled={guardandoDetalle} className="btn-primary h-12 w-full">
                  {guardandoDetalle ? <Spinner /> : <Icon name="check" size={18} strokeWidth={2.25} />} Está correcto
                </button>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={iniciarEdicion} className="btn-secondary h-11"><Icon name="edit" size={16} /> Editar</button>
                {!esReferencia(gastoDetalle) ? (
                  <button onClick={() => abrirModalFraccionar(gastoDetalle)} className="btn-secondary h-11"><Icon name="split" size={16} /> Fraccionar</button>
                ) : (
                  <span className="grid place-items-center rounded-xl bg-white/[0.04] px-3 text-center text-xs text-muted">
                    {gastoDetalle.EsPagoDeCuota ? 'Se gestiona en Cuotas' : 'Ya fraccionado'}
                  </span>
                )}
              </div>
              {!esReferencia(gastoDetalle) && (
                <button onClick={() => setModoDetalle('eliminar')} className="btn-ghost h-10 w-full text-negative/80 hover:bg-negative/10 hover:text-negative">
                  <Icon name="trash" size={16} /> Eliminar gasto
                </button>
              )}
            </div>
          </>
        )}

        {gastoDetalle && modoDetalle === 'editar' && (
          <form onSubmit={guardarEdicion} className="flex flex-col gap-5">
            {esEditableMonto && (
              <>
                <Segmented value={edicion.Moneda} onChange={(v) => setEdicion(s => ({ ...s, Moneda: v }))} options={[{ value: 'PEN', label: 'Soles (S/)' }, { value: 'USD', label: 'Dólares ($)' }]} />
                <Field label="Monto">
                  <AmountInput value={edicion.Monto} onChange={(e) => setEdicion(s => ({ ...s, Monto: e.target.value }))} moneda={edicion.Moneda} />
                </Field>
              </>
            )}
            <Field label="Comercio">
              <input type="text" value={edicion.Comercio} onChange={(e) => setEdicion(s => ({ ...s, Comercio: e.target.value }))} className="input" required />
            </Field>
            <Field label="Categoría" hint="Elige una de la lista o escribe una nueva.">
              <input list="categorias-gasto" value={edicion.Categoria} onChange={(e) => setEdicion(s => ({ ...s, Categoria: e.target.value }))} className="input" required />
            </Field>
            {errorDetalle && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{errorDetalle}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setModoDetalle('ver')} className="btn-secondary h-12">Cancelar</button>
              <button type="submit" disabled={guardandoDetalle} className="btn-primary h-12">{guardandoDetalle ? <><Spinner /> Guardando…</> : 'Guardar'}</button>
            </div>
          </form>
        )}

        {gastoDetalle && modoDetalle === 'eliminar' && (
          <>
            <div className="mb-6 rounded-2xl border border-negative/20 bg-negative/[0.06] p-5 text-center">
              <p className="text-3xl font-medium tracking-tight text-ink num">{formatMonto(gastoDetalle.Monto, gastoDetalle.Moneda)}</p>
              <p className="mt-1.5 text-sm text-muted">{formatFecha(gastoDetalle.FechaOperacion)} · {gastoDetalle.Categoria}</p>
            </div>
            <p className="mb-6 text-sm text-muted">Úsalo para gastos duplicados o que no te corresponden. Esta acción no se puede deshacer.</p>
            {errorDetalle && <p className="mb-4 rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{errorDetalle}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setModoDetalle('ver')} className="btn-secondary h-12">Cancelar</button>
              <button onClick={eliminarGasto} disabled={guardandoDetalle} className="btn h-12 bg-negative text-canvas hover:bg-negative/90">
                {guardandoDetalle ? <><Spinner /> Eliminando…</> : 'Eliminar'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <datalist id="categorias-gasto">
        {categorias.map(c => <option key={c} value={c} />)}
      </datalist>

      {/* --- 2. NUEVO GASTO --- */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo gasto" subtitle="Escríbelo como lo dirías o llena los campos.">
        <form onSubmit={handleCrearGasto} className="flex flex-col gap-5">
          {/* Registro rápido con IA */}
          <div className="rounded-2xl border border-line bg-canvas p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={textoRapido}
                onChange={(e) => setTextoRapido(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); interpretarTexto(); } }}
                placeholder='Ej. "almuerzo 25 yape"'
                className="h-11 min-w-0 flex-1 bg-transparent px-2 text-ink placeholder:text-faint outline-none"
                maxLength={300}
              />
              <button type="button" onClick={interpretarTexto} disabled={interpretando || !textoRapido.trim()} className="btn-primary h-11 shrink-0 px-3.5">
                {interpretando ? <Spinner /> : <Icon name="wand" size={17} />} <span className="hidden sm:inline">Completar</span>
              </button>
            </div>
            {desdeTexto && <p className="px-2 pt-2 text-xs text-accent">Listo: revisa los datos y guarda.</p>}
          </div>

          <Segmented
            value={moneda}
            onChange={setMoneda}
            options={[{ value: 'PEN', label: 'Soles (S/)' }, { value: 'USD', label: 'Dólares ($)' }]}
          />

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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <input list="categorias-gasto" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} className="input" required />
            </Field>
            <Field label="Fecha">
              <input type="date" value={nuevaFecha} max={hoyISO()} onChange={(e) => setNuevaFecha(e.target.value)} className="input num" required />
            </Field>
          </div>

          <div>
            <span className="label">En el hogar</span>
            <Segmented value={nuevoCompartido} onChange={setNuevoCompartido} options={COMPARTIDO_OPCIONES} />
          </div>

          {errorNuevo && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">{errorNuevo}</p>}

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
