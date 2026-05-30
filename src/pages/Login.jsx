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
      const response = await apiAuth.post('/login', {
        Email: email,
        Password: password
      });

      if (response.data.Success) {
        localStorage.setItem('token', response.data.Token);
        localStorage.setItem('userId', response.data.UserId);
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
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Efecto Glow de fondo (Esfera borrosa) más sutil */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[128px] opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600 rounded-full mix-blend-screen filter blur-[128px] opacity-10"></div>

      {/* Tarjeta Elegante */}
      <div className="z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-gray-800 p-10 rounded-3xl shadow-2xl">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Hogar<span className="text-indigo-500">App</span>
          </h1>
          <p className="text-gray-400 font-medium">Control financiero inteligente</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/50 border border-gray-700 text-white px-4 py-3 rounded-xl outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-gray-700 text-white px-4 py-3 rounded-xl outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl font-medium text-sm text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 w-full bg-indigo-600 text-white font-medium text-lg py-3 rounded-xl shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Conectando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}