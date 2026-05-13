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
    <div className="flex h-screen bg-fondo-oscuro text-white font-sans relative overflow-hidden">
      {/* Brillos de fondo globales */}
      <div className="absolute top-[-20%] left-[50%] w-[800px] h-[800px] bg-brillo-primario rounded-full mix-blend-screen filter blur-[200px] opacity-10 pointer-events-none"></div>

      {/* --- SIDEBAR PARA PC (Oculto en móviles) --- */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r-4 border-brillo-primario flex-col z-10 shadow-[8px_0px_0px_0px_rgba(139,92,246,0.3)]">
        <div className="p-8">
          <h2 className="text-3xl font-extrabold tracking-tighter">
            Hogar<span className="text-brillo-primario">App</span>
          </h2>
        </div>
        
        <nav className="flex-1 px-4 flex flex-col gap-4 mt-8">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 text-lg font-bold border-2 transition-all ${
                location.pathname === item.path 
                ? 'bg-brillo-primario text-white border-brillo-primario shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]' 
                : 'border-transparent text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            >
              <span className="text-2xl">{item.icon}</span> {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4">
          <button 
            onClick={handleLogout}
            className="w-full bg-red-500 text-white font-bold py-3 border-2 border-transparent hover:border-white hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all"
          >
            CERRAR SESIÓN
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      {/* En celular le damos un padding bottom extra (pb-24) para que la barra inferior no tape el contenido */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto z-10 pb-24 md:pb-8">
        {children}
      </main>

      {/* --- BARRA INFERIOR PARA CELULAR (Oculta en PC) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t-4 border-brillo-primario flex justify-around items-center p-2 z-50 pb-safe">
        {navItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.path}
            className={`flex flex-col items-center p-2 rounded w-16 ${
              location.pathname === item.path 
              ? 'text-brillo-primario scale-110 transition-transform' 
              : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-[10px] font-bold uppercase">{item.name}</span>
          </Link>
        ))}
        
        {/* Botón de Salir en el celular */}
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center p-2 rounded w-16 text-red-500 hover:text-red-400"
        >
          <span className="text-2xl mb-1">🚪</span>
          <span className="text-[10px] font-bold uppercase">Salir</span>
        </button>
      </nav>
    </div>
  );
}