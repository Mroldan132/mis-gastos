import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiGastos } from '../services/api';
import { Icon, PageHeader, PeriodPicker, Spinner } from '../components/ui';
import { periodoActual, periodoTexto, exportarGastosCSV } from '../lib/format';

const secciones = [
  { path: '/ingresos', icon: 'wallet', titulo: 'Ingresos', descripcion: 'Sueldo y otros ingresos del mes' },
  { path: '/cuotas', icon: 'card', titulo: 'Cuotas', descripcion: 'Fraccionamientos y próximos cobros' },
  { path: '/metas', icon: 'target', titulo: 'Metas', descripcion: 'Tus ahorros para objetivos' },
];

// Secciones que no caben en la barra inferior del celular
export default function Mas() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState(periodoActual);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState('');

  const exportar = async () => {
    setExportando(true);
    setAviso('');
    const mes = periodoTexto(periodo);
    try {
      const { data } = await apiGastos.get(`/gastos?mes=${mes}`);
      if (!data.Gastos?.length) setAviso('No hay gastos en ese mes.');
      else exportarGastosCSV(data.Gastos, mes);
    } catch (e) {
      console.error(e);
      setAviso('No pudimos exportar. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Layout>
      <PageHeader eyebrow="Todo lo demás" title="Más" />

      <div className="flex flex-col gap-4">
        <section className="card divide-y divide-line overflow-hidden animate-fade-up">
          {secciones.map(s => (
            <Link key={s.path} to={s.path} className="flex items-center gap-4 px-5 py-4 transition-colors active:bg-white/[0.04] md:hover:bg-white/[0.025]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-elevated text-muted"><Icon name={s.icon} size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{s.titulo}</p>
                <p className="text-sm text-faint">{s.descripcion}</p>
              </div>
              <Icon name="chevronRight" size={18} className="text-faint" />
            </Link>
          ))}
        </section>

        <section className="card p-5 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="mb-4 flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="download" size={20} /></span>
            <div>
              <p className="font-medium text-ink">Exportar a Excel</p>
              <p className="text-sm text-faint">Descarga los gastos de un mes en CSV.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodPicker periodo={periodo} onChange={setPeriodo} />
            <button onClick={exportar} disabled={exportando} className="btn-primary">
              {exportando ? <Spinner /> : <Icon name="download" size={18} />} Descargar
            </button>
          </div>
          {aviso && <p className="mt-3 text-sm text-muted">{aviso}</p>}
        </section>

        <button
          onClick={() => { localStorage.clear(); navigate('/login'); }}
          className="card flex items-center gap-4 px-5 py-4 text-left text-negative/90 transition-colors hover:bg-negative/[0.06] animate-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-negative/10"><Icon name="logout" size={20} /></span>
          <span className="font-medium">Cerrar sesión</span>
        </button>
      </div>
    </Layout>
  );
}
