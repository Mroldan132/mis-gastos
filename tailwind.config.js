/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Superficies (de la más profunda a la más elevada)
        canvas: '#09090B',
        surface: '#141417',
        elevated: '#1C1C20',
        line: 'rgba(255, 255, 255, 0.07)',
        'line-strong': 'rgba(255, 255, 255, 0.13)',
        // Tinta
        ink: '#F4F4F5',
        muted: '#A1A1AA',
        faint: '#71717A',
        // Acento único de la marca
        accent: { DEFAULT: '#D4F75A', hover: '#E2FA8A' },
        // Semánticos (siempre acompañados de ícono o texto)
        positive: '#34D399',
        negative: '#FB7185',
        warning: '#FBBF24',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(8px) scale(0.98)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
}
