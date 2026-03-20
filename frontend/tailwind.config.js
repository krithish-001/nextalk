/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        surface: {
          0:   '#0a0a0f',
          50:  '#111118',
          100: '#16161f',
          200: '#1c1c28',
          300: '#242433',
          400: '#2e2e42',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-in-left':  'slideInLeft  0.25s ease-out',
        'fade-in':        'fadeIn       0.2s  ease-out',
        'bounce-dot':     'bounceDot   1.4s  infinite ease-in-out both',
        'pulse-ring':     'pulseRing   2s    infinite',
      },
      keyframes: {
        slideInRight: {
          '0%':   { transform: 'translateX(20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)',     opacity: 1 },
        },
        slideInLeft: {
          '0%':   { transform: 'translateX(-20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)',      opacity: 1 },
        },
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%':           { transform: 'scale(1)' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(0.8)', opacity: 1 },
          '100%': { transform: 'scale(2)',   opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};
