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

export const nombreMes = (texto) => {
  const [anio, mes] = (texto || '').split('-').map(Number);
  return mes ? `${MESES[mes - 1]} ${anio}` : texto;
};

export const nombreMesCorto = (texto) => {
  const [, mes] = (texto || '').split('-').map(Number);
  return mes ? MESES[mes - 1].slice(0, 3) : texto;
};

export const hoyISO = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

// ====================================================
// GASTOS
// ====================================================

export const CATEGORIAS_BASE = ['Comida', 'Transporte', 'Servicios', 'Hogar', 'Entretenimiento', 'Salud', 'Tecnología', 'Educación', 'Ropa', 'Otros'];

// La IA crea categorías libres: se combinan las base con las que realmente aparecen
export const unirCategorias = (...listas) =>
  [...new Set([...CATEGORIAS_BASE, ...listas.flat().filter(Boolean)])].filter(c => c !== 'Ahorro').sort((a, b) => a.localeCompare(b, 'es'));

export const esReferencia = (gasto) => gasto.EsGastoReferencia || gasto.EsPagoDeCuota;

// Gastos leídos de un correo por la IA que nadie confirmó todavía.
// Los registros anteriores a esta función no tienen Origen: se reconocen por venir de un banco.
export const leidoPorIA = (gasto) =>
  gasto.Origen === 'Correo' || (!gasto.Origen && !esReferencia(gasto) && !!gasto.Banco && !['Efectivo/Otro', 'Transferencia Interna', 'Pago fijo'].includes(gasto.Banco));

// Solo los que llegan desde que existe la revisión (los antiguos no se marcan, serían cientos)
export const porRevisar = (gasto) => gasto.Origen === 'Correo' && !gasto.Revisado;

// ====================================================
// EXPORTAR A CSV (se abre directo en Excel)
// ====================================================

export const descargarCSV = (nombreArchivo, columnas, filas) => {
  const celda = (valor) => {
    const texto = valor == null ? '' : String(valor);
    return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = [columnas.map(c => celda(c.titulo)), ...filas.map(f => columnas.map(c => celda(c.valor(f))))]
    .map(linea => linea.join(','))
    .join('\r\n');

  // El BOM hace que Excel reconozca las tildes
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
};

export const exportarGastosCSV = (gastos, mes) => descargarCSV(`gastos-${mes}.csv`, [
  { titulo: 'Fecha', valor: g => (g.EsPagoDeCuota ? g.FechaActualizacion : g.FechaOperacion)?.replace('T', ' ') },
  { titulo: 'Comercio', valor: g => g.Comercio },
  { titulo: 'Categoría', valor: g => g.Categoria },
  { titulo: 'Monto', valor: g => Number(g.Monto).toFixed(2) },
  { titulo: 'Moneda', valor: g => g.Moneda || 'PEN' },
  { titulo: 'Monto en soles', valor: g => Number(g.MontoPEN > 0 ? g.MontoPEN : g.Monto).toFixed(2) },
  { titulo: 'Medio de pago', valor: g => g.Banco },
  { titulo: 'Tipo', valor: g => (g.EsPagoDeCuota ? 'Cuota' : g.EsGastoReferencia ? 'Fraccionado' : 'Gasto') },
  { titulo: 'Origen', valor: g => (leidoPorIA(g) ? 'Correo (IA)' : g.Origen || 'Manual') },
], gastos);
