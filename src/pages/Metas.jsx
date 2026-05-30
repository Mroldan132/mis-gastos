import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { apiMetas } from '../services/api'; 

export default function Metas() {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [icono, setIcono] = useState('🎯');

  const [isAhorroModalOpen, setIsAhorroModalOpen] = useState(false);
  const [metaSeleccionada, setMetaSeleccionada] = useState(null);
  const [montoAhorrar, setMontoAhorrar] = useState('');
  const [ahorrando, setAhorrando] = useState(false);

  const fetchMetas = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    try {
      const response = await apiMetas.get(`/metas?userId=${userId}`);
      if (response.data.Success) {
        setMetas(response.data.Metas);
      }
    } catch (error) { console.error("Error cargando metas:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMetas(); }, []);

  const handleCrearMeta = async (e) => {
    e.preventDefault();
    try {
      const response = await apiMetas.post('/metas', {
        UserId: localStorage.getItem('userId'),
        Nombre: nombre,
        Categoria: "Ahorro",
        MontoObjetivo: parseFloat(objetivo),
        Icono: icono
      });

      if (response.data.Success) {
        setIsModalOpen(false);
        setNombre('');
        setObjetivo('');
        fetchMetas(); 
      }
    } catch (error) { console.error("Error al crear meta", error); }
  };

  const handleAhorrar = async (e) => {
    e.preventDefault();
    setAhorrando(true);
    try {
      const response = await apiMetas.put('/metas/aportar', {
        UserId: localStorage.getItem('userId'),
        MetaId: metaSeleccionada.MetaId,
        MontoAporte: parseFloat(montoAhorrar)
      });
      if (response.data.Success) {
        setIsAhorroModalOpen(false);
        setMontoAhorrar('');
        fetchMetas(); 
      }
    } catch (error) { console.error("Error al aportar:", error); } 
    finally { setAhorrando(false); }
  };

  return (
    <Layout>
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Mis Metas</h1>
          <p className="text-gray-400 text-sm mt-1">Convirtiendo pequeños ahorros en grandes logros.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all hover:-translate-y-0.5"
        >
          + Nueva Meta
        </button>
      </header>

      {loading ? (
        <div className="text-center text-indigo-400 font-medium py-20 animate-pulse">Cargando tus metas...</div>
      ) : metas.length === 0 ? (
        <div className="text-center text-gray-500 py-20 border border-dashed border-gray-700 rounded-2xl p-10 bg-slate-900/30">
          <p className="text-lg font-semibold mb-2 text-gray-400">No tienes metas activas</p>
          <p className="text-sm">Es el momento perfecto para empezar a ahorrar para ese próximo viaje.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metas.map(meta => {
            const progreso = meta.MontoObjetivo > 0 ? (meta.MontoActual / meta.MontoObjetivo) * 100 : 0;
            const completado = progreso >= 100;

            return (
              <div key={meta.MetaId} className={`bg-slate-900 border ${completado ? 'border-emerald-500/30 shadow-emerald-500/10' : 'border-gray-800'} p-6 rounded-2xl shadow-lg transition-transform hover:-translate-y-1 relative overflow-hidden`}>
                {completado && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>}
                
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl border border-gray-700 shadow-sm">
                    {meta.Icono}
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-[11px] uppercase tracking-wider mb-0.5 ${completado ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {completado ? 'Completado' : 'Faltan'}
                    </p>
                    {!completado && (
                      <p className="text-lg font-bold text-white">S/ {(meta.MontoObjetivo - meta.MontoActual).toFixed(2)}</p>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-4 break-words leading-tight">{meta.Nombre}</h3>

                <div className="mb-4">
                  <div className="flex justify-between text-xs font-medium text-gray-400 mb-2">
                    <span>{progreso.toFixed(1)}%</span>
                    <span>S/ {meta.MontoObjetivo.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-gray-800">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out rounded-full ${completado ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(progreso, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-medium text-gray-500">Ahorrado</span>
                    <span className="text-gray-200 font-semibold text-sm">S/ {meta.MontoActual.toFixed(2)}</span>
                  </div>
                  
                  {!completado && (
                    <button 
                      onClick={() => { setMetaSeleccionada(meta); setIsAhorroModalOpen(true); }}
                      className="bg-slate-800 text-gray-300 px-4 py-2 text-xs font-medium rounded-lg border border-gray-700 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
                    >
                      Sumar Ahorro
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL PARA CREAR META --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-gray-800 p-8 max-w-md w-full rounded-2xl shadow-2xl relative animate-fade-in">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors text-xl">✕</button>
            <h2 className="text-2xl font-semibold text-white mb-6 tracking-tight">Nueva Meta</h2>
            
            <form onSubmit={handleCrearMeta} className="flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="w-1/4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Icono</label>
                    <input type="text" value={icono} onChange={(e) => setIcono(e.target.value)} className="w-full bg-slate-950/50 border border-gray-700 text-white px-2 py-3 text-center text-2xl rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner" maxLength="2" required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de la Meta</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-slate-950/50 border border-gray-700 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner" placeholder="Ej. Laptop Nueva" required />
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Monto a alcanzar (S/)</label>
                    <input type="number" step="0.01" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="w-full bg-slate-950/50 border border-gray-700 text-white px-4 py-3 text-xl font-medium rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner" placeholder="0.00" required />
                </div>

                <button type="submit" className="mt-2 w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25">
                    Guardar Meta
                </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL PARA APORTAR --- */}
      {isAhorroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-gray-800 p-8 max-w-sm w-full rounded-2xl shadow-2xl relative animate-fade-in">
            <button onClick={() => setIsAhorroModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors text-xl">✕</button>
            <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight">Sumar Ahorro</h2>
            <p className="text-gray-400 text-sm mb-6">¿Cuánto vas a separar para <span className="text-gray-200 font-medium">"{metaSeleccionada?.Nombre}"</span>?</p>
            
            <form onSubmit={handleAhorrar} className="flex flex-col gap-5">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Monto a separar (S/)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={montoAhorrar}
                        onChange={(e) => setMontoAhorrar(e.target.value)}
                        className="w-full bg-slate-950/50 border border-gray-700 text-white px-4 py-4 text-2xl font-bold text-center rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner"
                        placeholder="0.00"
                        required
                    />
                </div>
                <button type="submit" disabled={ahorrando} className="mt-2 w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50">
                    {ahorrando ? 'Procesando...' : 'Confirmar Aporte'}
                </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}