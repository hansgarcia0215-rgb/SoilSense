/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand greens
        brand: {
          50:  '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
          300: '#86efac', 400: '#4ade80', 500: '#22c55e',
          600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d',
          950: '#052e16',
        },
        // Soil earth tones
        soil: {
          50: '#fdf8f0', 100: '#f9edd8', 200: '#f0d4a8',
          300: '#e4b472', 400: '#d4874a', 500: '#c2673a',
          600: '#a44f2e', 700: '#7f3d27', 800: '#5e2d1e', 900: '#3f1e13',
        },
        // Surface / glass
        surface: {
          DEFAULT: 'rgba(255,255,255,0.8)',
          dark:    'rgba(15,23,42,0.8)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand':    'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)',
        'gradient-fertile':  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'gradient-moderate': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'gradient-poor':     'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-hero':     'linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #15803d 100%)',
        'gradient-mesh':     'radial-gradient(at 40% 20%, #22c55e33 0px, transparent 50%), radial-gradient(at 80% 0%, #16a34a22 0px, transparent 50%), radial-gradient(at 0% 50%, #dcfce766 0px, transparent 50%)',
        'shimmer':           'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(34,197,94,0.3)',
        'glow-sm':    '0 0 10px rgba(34,197,94,0.2)',
        'card':       '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 10px 30px -5px rgba(0,0,0,0.12), 0 4px 10px -3px rgba(0,0,0,0.08)',
        'card-lg':    '0 20px 60px -10px rgba(0,0,0,0.15)',
        'inner-sm':   'inset 0 1px 3px rgba(0,0,0,0.08)',
      },
      backdropBlur: { xs: '2px' },
      borderRadius: {
        '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem',
      },
      animation: {
        'fade-in-up':    'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in':       'fadeIn 0.3s ease-out forwards',
        'scale-in':      'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right':'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down':    'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer':       'shimmer 1.8s infinite',
        'float':         'float 3s ease-in-out infinite',
        'count-up':      'countUp 1s ease-out forwards',
        'draw':          'draw 1.5s ease-in-out forwards',
        'ping-slow':     'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'bounce-sm':     'bounceSm 1s ease-in-out infinite',
        'spin-slow':     'spin 3s linear infinite',
        'pulse-brand':   'pulseBrand 2s ease-in-out infinite',
        'wiggle':        'wiggle 0.5s ease-in-out',
        'progress':      'progress 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px) scaleY(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scaleY(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        bounceSm: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        pulseBrand: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(34,197,94,0.15)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%':      { transform: 'rotate(3deg)' },
        },
        progress: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      transitionTimingFunction: {
        'spring':    'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'sharp':     'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      transitionDuration: {
        '250': '250ms', '400': '400ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
