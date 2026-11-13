/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#0B261D',
          800: '#123C2D', // Primary forest green
          700: '#1B523E',
          600: '#21865B', // Secondary green
          500: '#32A56C', // Accent green
          400: '#54BA86',
          100: '#E8F4EC', // Soft green
          50: '#F4F9F6',
        },
        cattleguard: {
          primary: '#123C2D',
          secondary: '#21865B',
          accent: '#32A56C',
          soft: '#E8F4EC',
          bg: '#F5F7F3',
          card: '#FFFFFF',
          text: '#202B26',
          muted: '#7A8980',
          border: '#E3E8E3',
          danger: '#D94F50',
          warning: '#E6A23C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(18, 60, 45, 0.05), 0 1px 2px -1px rgba(18, 60, 45, 0.05)',
        'card-hover': '0 8px 24px -4px rgba(18, 60, 45, 0.08), 0 2px 6px -2px rgba(18, 60, 45, 0.04)',
        'modal': '0 20px 45px -10px rgba(18, 60, 45, 0.25)',
      }
    },
  },
  plugins: [],
}


