// ====================================================
// FORMATO DE MONTOS, FECHAS Y PERIODOS
// ====================================================

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const formatMonto = (valor, moneda = 'PEN') => {
  const numero = Number(valor) || 0;
  const texto = numero.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${moneda === 'USD' ? '$' : 'S/'} ${texto}`;
};

const aFecha = (valor) => (valor ? new Date(valor.includes('T') ? valor : `${valor}T00:00:00`) : null);

export const formatFecha = (valor) => {
  const fecha = aFecha(valor);
  if (!fecha || isNaN(fecha)) return valor || '';
  return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatHora = (valor) => {
  const fecha = aFecha(valor);
  if (!fecha || isNaN(fecha) || !valor.includes('T')) return '';
  return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

export const periodoActual = () => {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
};

export const periodoTexto = ({ anio, mes }) => `${anio}-${String(mes).padStart(2, '0')}`;
