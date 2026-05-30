import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Gastos', path: '/gastos', icon: '💸' },
    { name: 'Ingresos', path: '/ingresos', icon: '💰' },
    { name: 'Cuotas', path: '/cuotas', icon: '💳' } ,
    { name: 'Metas', path: '/metas', icon: '🎯' }
  ];

  return (
    <div className="flex h-screen bg-[#0b0f19] text-white font-sans relative overflow-hidden">
      {/* Brillos de fondo globales - Suavizados y más elegantes */}
      <div className="absolute top-[-20%] left-[50%] w-[800px] h-[800px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[250px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-600 rounded-full mix-blend-screen filter blur-[200px] opacity-5 pointer-events-none"></div>

      {/* --- SIDEBAR PARA PC (Oculto en móviles) --- */}
      <aside className="hidden md:flex w-64 bg-slate-900/50 backdrop-blur-xl border-r border-gray-800 flex-col z-10 shadow-2xl">
        <div className="p-8 pb-6 border-b border-gray-800/50">
          <h2 className="text-3xl font-bold tracking-tight">
            Hogar<span className="text-indigo-500">App</span>
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Control Financiero</p>
        </div>
        
        <nav className="flex-1 px-4 flex flex-col gap-2 mt-6">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                location.pathname === item.path 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm' 
                : 'border border-transparent text-gray-400 hover:bg-slate-800/50 hover:text-gray-200'
              }`}
            >
              <span className="text-xl">{item.icon}</span> {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-800/50">
          <button 
            onClick={handleLogout}
            className="w-full bg-slate-800/50 text-red-400 font-medium py-2.5 rounded-xl border border-gray-700/50 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>🚪</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      {/* En celular le damos un padding bottom extra (pb-24) para que la barra inferior no tape el contenido */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto z-10 pb-24 md:pb-8 scroll-smooth">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* --- BARRA INFERIOR PARA CELULAR (Oculta en PC) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-xl border-t border-gray-800 flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {navItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.path}
            className={`flex flex-col items-center justify-center p-2 rounded-xl w-16 transition-all ${
              location.pathname === item.path 
              ? 'text-indigo-400 bg-indigo-500/10' 
              : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className={`text-2xl mb-1 transition-transform ${location.pathname === item.path ? 'scale-110' : 'scale-100'}`}>{item.icon}</span>
            <span className="text-[9px] font-medium uppercase tracking-wider">{item.name}</span>
          </Link>
        ))}
        
        {/* Botón de Salir en el celular */}
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center p-2 rounded-xl w-16 text-gray-500 hover:text-red-400 transition-colors"
        >
          <span className="text-2xl mb-1">🚪</span>
          <span className="text-[9px] font-medium uppercase tracking-wider">Salir</span>
        </button>
      </nav>
    </div>
  );
}