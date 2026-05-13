import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
// Importamos la nueva apiMetas
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

  // 1. OBTENER LAS METAS REALES DE C#
  const fetchMetas = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    try {
      const response = await apiMetas.get(`/metas?userId=${userId}`);
      if (response.data.Success) {
        setMetas(response.data.Metas);
      }
    } catch (error) {
      console.error("Error cargando metas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetas();
  }, []);

  // 2. CREAR UNA META NUEVA
  const handleCrearMeta = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    try {
      const response = await apiMetas.post('/metas', {
        UserId: userId,
        Nombre: nombre,
        Categoria: "Ahorro",
        MontoObjetivo: parseFloat(objetivo),
        Icono: icono
      });

      if (response.data.Success) {
        setIsModalOpen(false);
        setNombre('');
        setObjetivo('');
        fetchMetas(); // Recargar la lista
      }
    } catch (error) {
      console.error("Error al crear meta", error);
    }
  };

  // 3. APORTAR DINERO A LA META
  const handleAhorrar = async (e) => {
    e.preventDefault();
    setAhorrando(true);
    const userId = localStorage.getItem('userId');
    
    try {
      // Llamamos a la ruta terminada en /aportar
      const response = await apiMetas.put('/metas/aportar', {
        UserId: userId,
        MetaId: metaSeleccionada.MetaId,
        MontoAporte: parseFloat(montoAhorrar)
      });

      if (response.data.Success) {
        setIsAhorroModalOpen(false);
        setMontoAhorrar('');
        fetchMetas(); // Recargamos para ver la barra de progreso avanzar
      }
    } catch (error) {
      console.error("Error al aportar:", error);
    } finally {
      setAhorrando(false);
    }
  };

  return (
    <Layout>
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Mis Metas</h1>
          <p className="text-gray-400 font-bold mt-1">Convirtiendo gastos en sueños.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-acento-neobrutal text-slate-900 font-extrabold px-6 py-3 border-4 border-transparent hover:border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all"
        >
          + NUEVA META
        </button>
      </header>

      {loading ? (
        <div className="text-center text-brillo-primario font-black py-20 animate-pulse text-2xl">CARGANDO TUS METAS...</div>
      ) : metas.length === 0 ? (
        <div className="text-center text-gray-500 py-20 border-4 border-dashed border-gray-700 p-10">
          <p className="text-xl font-bold uppercase mb-2">No tienes metas activas</p>
          <p>Es un buen momento para empezar a ahorrar para ese próximo viaje.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {metas.map(meta => {
            const progreso = meta.MontoObjetivo > 0 ? (meta.MontoActual / meta.MontoObjetivo) * 100 : 0;
            const completado = progreso >= 100;

            return (
              <div key={meta.MetaId} className={`bg-slate-900 border-4 ${completado ? 'border-green-400' : 'border-white'} p-6 shadow-[8px_8px_0px_0px_rgba(139,92,246,1)] transition-transform hover:-translate-y-2`}>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-5xl">{meta.Icono}</span>
                  <div className="text-right">
                    <p className={`font-bold text-xs uppercase ${completado ? 'text-green-400' : 'text-gray-400'}`}>
                      {completado ? '¡META ALCANZADA!' : 'Faltan'}
                    </p>
                    {!completado && (
                      <p className="text-xl font-black text-white">S/ {(meta.MontoObjetivo - meta.MontoActual).toFixed(2)}</p>
                    )}
                  </div>
                </div>

                <h3 className="text-2xl font-black text-white uppercase mb-4 break-words">{meta.Nombre}</h3>

                <div className="w-full h-8 bg-slate-800 border-4 border-white mb-4 relative overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${completado ? 'bg-green-400' : 'bg-acento-neobrutal'}`}
                    style={{ width: `${Math.min(progreso, 100)}%` }}
                  ></div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-difference">
                    {progreso.toFixed(1)}% COMPLETADO
                  </span>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <p className="text-gray-400 font-bold">S/ {meta.MontoActual.toFixed(2)} <span className="text-xs">de</span> S/ {meta.MontoObjetivo.toFixed(2)}</p>
                  
                  {!completado && (
                    <button 
                      onClick={() => { setMetaSeleccionada(meta); setIsAhorroModalOpen(true); }}
                      className="bg-white text-slate-900 px-4 py-2 font-black text-sm border-2 border-transparent hover:bg-acento-neobrutal transition-colors active:translate-y-1"
                    >
                      AHORRAR
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border-4 border-acento-neobrutal p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(16,185,129,1)] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-2xl font-extrabold text-white mb-6 uppercase tracking-tight">Nueva Meta</h2>
            
            <form onSubmit={handleCrearMeta} className="flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="w-1/4">
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Icono</label>
                    <input type="text" value={icono} onChange={(e) => setIcono(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 text-white px-2 py-3 text-center text-2xl outline-none focus:border-acento-neobrutal" maxLength="2" required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Nombre de la Meta</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 text-white px-4 py-3 outline-none focus:border-acento-neobrutal" placeholder="Ej. Laptop Nueva" required />
                  </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Monto a alcanzar (S/)</label>
                    <input type="number" step="0.01" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="w-full bg-slate-800 border-2 border-gray-600 text-white px-4 py-3 outline-none focus:border-acento-neobrutal text-xl font-bold" placeholder="0.00" required />
                </div>

                <button type="submit" className="mt-4 w-full bg-acento-neobrutal text-slate-900 font-extrabold text-lg py-4 border-4 border-transparent hover:border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all">
                    GUARDAR META
                </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL PARA APORTAR --- */}
      {isAhorroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border-4 border-brillo-primario p-8 max-w-sm w-full shadow-[12px_12px_0px_0px_rgba(139,92,246,1)] relative">
            <button onClick={() => setIsAhorroModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h2 className="text-2xl font-extrabold text-white mb-2 uppercase italic">Sumar Ahorro</h2>
            <p className="text-gray-400 text-sm mb-6 font-bold">¿Cuánto vas a separar para "{metaSeleccionada?.Nombre}"?</p>
            
            <form onSubmit={handleAhorrar} className="flex flex-col gap-6">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Monto a separar (S/)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={montoAhorrar}
                        onChange={(e) => setMontoAhorrar(e.target.value)}
                        className="w-full bg-slate-800 border-4 border-gray-700 text-white px-4 py-4 text-3xl font-black text-center focus:border-brillo-primario outline-none"
                        placeholder="0.00"
                        required
                    />
                </div>
                <button type="submit" disabled={ahorrando} className="w-full bg-brillo-primario text-white font-black py-4 text-xl border-4 border-transparent hover:border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all disabled:opacity-50">
                    {ahorrando ? 'PROCESANDO...' : 'CONFIRMAR APORTE'}
                </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}