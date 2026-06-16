/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F1A14',
        surface: '#162019',
        border: '#243B2D',
        'green-brand': '#2D6A4F',
        'green-light': '#40916C',
        gold: '#C9A84C',
        'gold-light': '#E9C46A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-red': 'pulse-red 1.5s ease-in-out infinite',
        flame: 'flame 0.6s ease-in-out',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { backgroundColor: '#7f1d1d', boxShadow: '0 0 0 0 rgba(239,68,68,0.7)' },
          '50%': { backgroundColor: '#dc2626', boxShadow: '0 0 0 6px rgba(239,68,68,0)' },
        },
        flame: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

