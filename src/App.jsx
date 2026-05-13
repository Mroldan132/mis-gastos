import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Gastos from './pages/Gastos';
import Ingresos from './pages/Ingresos';
import Cuotas from './pages/Cuotas'; 
import Metas from "./pages/Metas";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/ingresos" element={<Ingresos />} />
        <Route path="/cuotas" element={<Cuotas />} />
        <Route path="/metas" element={<Metas />} />
      </Routes>
    </Router>
  );
}

export default App;