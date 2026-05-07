/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fondo-oscuro': '#0F172A', // Un azul casi negro, ideal para resaltar brillos
        'brillo-primario': '#8B5CF6', // Morado vibrante para los Glows
        'acento-neobrutal': '#10B981', // Verde esmeralda para contrastes altos
      },
      boxShadow: {
        'neobrutal': '4px 4px 0px 0px rgba(0, 0, 0, 1)', // Sombra dura característica del neobrutalismo
        'glow': '0 0 20px rgba(139, 92, 246, 0.5)', // Efecto de brillo/blur tecnológico
      }
    },
  },
  plugins: [],
}