import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiGastos, BUZON_GASTOS } from '../services/api';
import { Icon, PageHeader, PeriodPicker, Spinner } from '../components/ui';
import { periodoActual, periodoTexto, exportarGastosCSV } from '../lib/format';
import { useInstalacion } from '../lib/nativo';

const secciones = [
  { path: '/ingresos', icon: 'wallet', titulo: 'Ingresos', descripcion: 'Sueldo y otros ingresos del mes' },
  { path: '/cuotas', icon: 'card', titulo: 'Cuotas', descripcion: 'Fraccionamientos y próximos cobros' },
  { path: '/metas', icon: 'target', titulo: 'Metas', descripcion: 'Tus ahorros para objetivos' },
];

// Correo del usuario, leído del token de sesión
const correoDeSesion = () => {
  try {
    const payload = localStorage.getItem('token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).email || null;
  } catch {
    return null;
  }
};

// Dirección personal de reenvío: misgastos.app+<alias>@gmail.com (el backend calcula el mismo alias)
const direccionDeReenvio = () => {
  const correo = correoDeSesion();
  if (!BUZON_GASTOS || !correo) return BUZON_GASTOS;
  const alias = correo.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const [local, dominio] = BUZON_GASTOS.split('@');
  return `${local}+${alias}@${dominio}`;
};

// Instalar en la pantalla de inicio. Se oculta si ya está instalada o si el navegador no lo permite.
function InstalarApp() {
  const { instalada, puedeInstalar, esIOS, instalar } = useInstalacion();
  if (instalada || (!puedeInstalar && !esIOS)) return null;

  return (
    <section className="card flex flex-col gap-4 p-5 animate-fade-up sm:flex-row sm:items-center">
      <img src="/icon-192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">Instala HogarApp</p>
        {puedeInstalar ? (
          <p className="text-sm text-faint">Ábrela desde tu pantalla de inicio, a pantalla completa, como cualquier app.</p>
        ) : (
          <p className="text-sm text-faint">
            En Safari toca <b className="text-muted">Compartir</b> (el cuadrado con la flecha) → <b className="text-muted">Agregar a inicio</b>.
          </p>
        )}
      </div>
      {puedeInstalar && (
        <button onClick={instalar} className="btn-primary shrink-0">
          <Icon name="download" size={18} /> Instalar
        </button>
      )}
    </section>
  );
}

function LecturaDeCorreos() {
  const direccion = direccionDeReenvio();
  const [copiado, setCopiado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(direccion);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* el usuario puede copiarla a mano */ }
  };

  return (
    <section className="card p-5 animate-fade-up" style={{ animationDelay: '30ms' }}>
      <div className="mb-4 flex items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="inbox" size={20} /></span>
        <div>
          <p className="font-medium text-ink">Lectura de correos del banco</p>
          <p className="text-sm text-faint">Reenvía las notificaciones de tu banco y la IA registra los gastos sola.</p>
        </div>
      </div>

      {!direccion ? (
        <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-muted">Todavía no hay una cuenta de correo configurada para la app.</p>
      ) : (
        <>
          <span className="label">Tu dirección de reenvío</span>
          <div className="flex gap-2">
            <code className="input flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap text-sm">{direccion}</code>
            <button onClick={copiar} className="btn-secondary h-12 shrink-0 px-4">
              <Icon name={copiado ? 'check' : 'copy'} size={16} /> {copiado ? 'Copiada' : 'Copiar'}
            </button>
          </div>

          <button onClick={() => setAbierto(a => !a)} className="btn-ghost mt-3 h-9 px-2 text-[13px] text-accent hover:text-accent">
            <Icon name={abierto ? 'chevronLeft' : 'chevronRight'} size={15} /> {abierto ? 'Ocultar pasos' : 'Cómo configurarlo en Gmail (5 minutos, una sola vez)'}
          </button>

          {abierto && (
            <ol className="mt-3 flex list-decimal flex-col gap-2.5 pl-5 text-sm text-muted animate-fade-in">
              <li>Abre Gmail <b className="text-ink">en la computadora</b> → ⚙️ <b className="text-ink">Ver todos los ajustes</b> → pestaña <b className="text-ink">Reenvío y correo POP/IMAP</b>.</li>
              <li><b className="text-ink">Agregar una dirección de reenvío</b> → pega tu dirección. Gmail enviará un código de confirmación a la app: pídeselo a quien administra la cuenta y confírmalo.</li>
              <li>Importante: en esa misma pestaña deja marcado <b className="text-ink">Inhabilitar el reenvío</b>. Así no se reenvía todo tu correo, solo lo que elija el filtro.</li>
              <li>Busca en Gmail un correo de tu banco → menú ⋮ → <b className="text-ink">Filtrar mensajes similares</b> → <b className="text-ink">Crear filtro</b> → marca <b className="text-ink">Reenviar a</b> y elige tu dirección.</li>
              <li>Repite el paso 4 por cada banco o billetera (Yape, Plin…) que te envíe notificaciones.</li>
            </ol>
          )}
        </>
      )}
    </section>
  );
}

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

        <InstalarApp />

        <LecturaDeCorreos />

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
