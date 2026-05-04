/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Thmanyah Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Thmanyah Serif Text', 'Georgia', 'serif'],
        display: ['Thmanyah Serif Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: { DEFAULT: '#6366F1', light: '#EEF2FF', dark: '#4F46E5' },
        surface: { DEFAULT: '#FFFFFF', muted: '#F9FAFB', subtle: '#F3F4F6' },
        border: { DEFAULT: '#E5E7EB', light: '#F3F4F6' },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
