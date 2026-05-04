/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1F2023',
          dark: '#0D0D0F',
          light: '#2E3033',
          hover: '#3A3A40',
        },
        border: {
          DEFAULT: '#333333',
          light: '#444444',
        },
        accent: {
          blue: '#1EAEDB',
          purple: '#8B5CF6',
          orange: '#F97316',
          green: '#10B981',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'zoom-in-95': { from: { transform: 'scale(0.95)' }, to: { transform: 'scale(1)' } },
        'zoom-out-95': { from: { transform: 'scale(1)' }, to: { transform: 'scale(0.95)' } },
        'slide-in-from-top-2': { from: { transform: 'translateY(-8px)' }, to: { transform: 'translateY(0)' } },
        'slide-in-from-bottom-2': { from: { transform: 'translateY(8px)' }, to: { transform: 'translateY(0)' } },
        'slide-in-from-left-2': { from: { transform: 'translateX(-8px)' }, to: { transform: 'translateX(0)' } },
        'slide-in-from-right-2': { from: { transform: 'translateX(8px)' }, to: { transform: 'translateX(0)' } },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'zoom-in-95': 'zoom-in-95 0.2s ease-out',
        'zoom-out-95': 'zoom-out-95 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
