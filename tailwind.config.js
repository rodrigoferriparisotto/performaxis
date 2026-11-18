/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // paleta da landing (sóbria: marinho + cinza, azul só para ação)
      colors: {
        marinho: '#0f1e33',
        institucional: { DEFAULT: '#1e4a8a', claro: '#2a5ca3' },
      },
    },
  },
  plugins: [],
};
