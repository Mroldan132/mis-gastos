import { useEffect, useState } from 'react';

// ====================================================
// COMPORTAMIENTO DE APP NATIVA
// ====================================================

// Registra el service worker (solo en producción: en desarrollo estorbaría a la recarga en vivo)
export const registrarServiceWorker = () => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('No se pudo registrar el service worker:', e));
  });
};

// El navegador avisa una sola vez que la app se puede instalar, a veces antes de que exista la pantalla
// que muestra el botón: se guarda el aviso aquí para usarlo cuando haga falta.
let avisoInstalacion = null;
const suscriptores = new Set();
const notificar = () => suscriptores.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    avisoInstalacion = e;
    notificar();
  });
  window.addEventListener('appinstalled', () => {
    avisoInstalacion = null;
    notificar();
  });
}

export const estaInstalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

// iPhone/iPad no ofrecen el aviso: se instala desde Compartir → "Agregar a inicio"
export const esIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useInstalacion() {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const fn = () => refrescar((n) => n + 1);
    suscriptores.add(fn);
    return () => suscriptores.delete(fn);
  }, []);

  const instalar = async () => {
    if (!avisoInstalacion) return false;
    avisoInstalacion.prompt();
    const { outcome } = await avisoInstalacion.userChoice;
    avisoInstalacion = null;
    notificar();
    return outcome === 'accepted';
  };

  return { instalada: estaInstalada(), puedeInstalar: !!avisoInstalacion, esIOS: esIOS(), instalar };
}

// Vibración corta al confirmar algo, como en las apps nativas (solo Android; en el resto no hace nada)
export const vibrar = (ms = 12) => {
  try { navigator.vibrate?.(ms); } catch { /* sin soporte */ }
};
