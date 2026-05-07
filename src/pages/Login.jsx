import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAuth } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Ajusta la ruta '/login' si tu API Gateway tiene otra ruta configurada
      const response = await apiAuth.post('/login', {
        Email: email,
        Password: password
      });

      if (response.data.Success) {
        // Guardamos el UserId y el Token en el navegador
        localStorage.setItem('token', response.data.Token);
        localStorage.setItem('userId', response.data.UserId);
        
        // ¡Magia! Lo enviamos al Dashboard
        navigate('/dashboard');
      } else {
        setError(response.data.Message || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error al conectar con el servidor. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fondo-oscuro flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Efecto Glow de fondo (Esfera borrosa) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brillo-primario rounded-full mix-blend-screen filter blur-[128px] opacity-30"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-acento-neobrutal rounded-full mix-blend-screen filter blur-[128px] opacity-20"></div>

      {/* Tarjeta Neobrutalista */}
      <div className="z-10 w-full max-w-md bg-slate-900 border-4 border-brillo-primario p-8 rounded-2xl shadow-[8px_8px_0px_0px_rgba(139,92,246,1)]">
        
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
          Hogar<span className="text-brillo-primario">App</span>
        </h1>
        <p className="text-gray-400 mb-8 font-medium">Control financiero inteligente.</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 rounded-none outline-none transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] focus:shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]"
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border-2 border-gray-600 focus:border-acento-neobrutal text-white px-4 py-3 rounded-none outline-none transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] focus:shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border-2 border-red-500 text-red-400 px-4 py-2 font-bold text-sm">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 w-full bg-acento-neobrutal text-slate-900 font-extrabold text-lg py-4 border-4 border-transparent hover:border-white hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'CONECTANDO...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  );
}