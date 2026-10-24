/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm paper grays (retint all default gray-* utilities)
        gray: {
          50:  '#faf6ee', 100: '#f1ead9', 200: '#e3d8c2',
          300: '#cdbfa4', 400: '#a3937a', 500: '#7d6e59',
          600: '#5c4f3d', 700: '#4a3f30', 800: '#3a3125', 900: '#33261a',
          950: '#241c12',
        },
        // Olive–forest greens (retint all default green-* utilities)
        green: {
          50:  '#f2f5ea', 100: '#e3ead2', 200: '#c7d6a8',
          300: '#a3bd7e', 400: '#7f9e58', 500: '#5f7f3c',
          600: '#4a652e', 700: '#3c5226', 800: '#2f4520', 900: '#24361a',
          950: '#131e0f',
        },
        // Deeper olive for emerald-* accents
        emerald: {
          50:  '#eef3e6', 100: '#dce8cc', 200: '#bcd4a3',
          300: '#96ba75', 400: '#6f9650', 500: '#527a38',
          600: '#3f602b', 700: '#334c23', 800: '#293d1d', 900: '#203017',
          950: '#101a0c',
        },
        // Soil earth tones
        soil: {
          50: '#fdf8f0', 100: '#f9edd8', 200: '#f0d4a8',
          300: '#e4b472', 400: '#d4874a', 500: '#c2673a',
          600: '#a44f2e', 700: '#7f3d27', 800: '#5e2d1e', 900: '#3f1e13',
        },
        // Organic editorial surfaces
        cream: {
          DEFAULT: '#f7f1e5',
          card:    '#fffdf8',
          border:  '#e6dac2',
          sand:    '#efe3c8',
          deep:    '#e2cfa4',
        },
        ink: {
          DEFAULT: '#33261a',
          soft:    '#6b5c46',
          faint:   '#9b8666',
        },
        terracotta: {
          DEFAULT: '#b05c34',
          dark:    '#8f4a28',
          light:   '#e2cfa4',
        },
        // Sidebar bark
        bark: {
          DEFAULT: '#1c2415',
          light:   '#2a3520',
          border:  '#33402a',
        },
        // Surface / glass
        surface: {
          DEFAULT: 'rgba(255,255,255,0.8)',
          dark:    'rgba(15,23,42,0.8)',
        },
      },
      fontFamily: {
        sans:    ['"Archivo"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
        hand:    ['"Caveat"', 'cursive'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand':    'linear-gradient(135deg, #3c5226 0%, #2f4520 100%)',
        'gradient-fertile':  'linear-gradient(135deg, #5f7f3c 0%, #3c5226 100%)',
        'gradient-moderate': 'linear-gradient(135deg, #d4874a 0%, #b05c34 100%)',
        'gradient-poor':     'linear-gradient(135deg, #a8402f 0%, #8f3223 100%)',
        'gradient-hero':     'linear-gradient(135deg, #24361a 0%, #2f4520 60%, #3c5226 100%)',
        'gradient-mesh':     'radial-gradient(at 40% 20%, #e3ead266 0px, transparent 50%), radial-gradient(at 80% 0%, #e2cfa455 0px, transparent 50%), radial-gradient(at 0% 50%, #f9edd866 0px, transparent 50%)',
        'shimmer':           'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(95,127,60,0.3)',
        'glow-sm':    '0 0 10px rgba(95,127,60,0.2)',
        'card':       '0 1px 3px 0 rgba(90,60,20,0.08), 0 4px 16px -8px rgba(90,60,20,0.12)',
        'card-hover': '0 14px 34px -10px rgba(90,60,20,0.22), 0 4px 10px -3px rgba(90,60,20,0.08)',
        'card-lg':    '0 24px 64px -12px rgba(90,60,20,0.25)',
        'inner-sm':   'inset 0 1px 3px rgba(90,60,20,0.08)',
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
