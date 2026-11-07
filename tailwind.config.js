/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#E8ECF3',
        navy: {
          900: '#151D30',
          800: '#202B45',
          700: '#2F3C5E',
          600: '#435478',
          500: '#5E6E82',
          400: '#8A99AD',
          300: '#B0BDCC',
          200: '#D5DDE7',
          100: '#E8ECF3'
        },
        primary: {
          DEFAULT: '#536DFE',
          hover: '#4258E8',
          light: '#7288FF',
          surface: '#EBF0FF'
        },
        success: {
          DEFAULT: '#10B981',
          light: '#E6F8F0',
          text: '#065F46'
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          text: '#92400E'
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          text: '#991B1B'
        }
      },
      boxShadow: {
        // Soft Neumorphism Shadows for background #E8ECF3
        'neu-raised-sm': '3px 3px 7px #cad1de, -3px -3px 7px #ffffff',
        'neu-raised': '6px 6px 14px #c6cedc, -6px -6px 14px #ffffff',
        'neu-raised-lg': '10px 10px 22px #c2cbda, -10px -10px 22px #ffffff',
        'neu-inset': 'inset 3px 3px 6px #cad1de, inset -3px -3px 6px #ffffff',
        'neu-inset-deep': 'inset 4px 4px 8px #c2cbda, inset -4px -4px 8px #ffffff',
        'neu-pressed': 'inset 2px 2px 5px #c6cedc, inset -2px -2px 5px #ffffff',
        'neu-btn-primary': '4px 4px 12px rgba(83, 109, 254, 0.35), -2px -2px 8px #ffffff',
        'neu-pill': '4px 4px 10px #cad1de, -4px -4px 10px #ffffff'
      },
      borderRadius: {
        'neu': '16px',
        'neu-sm': '12px',
        'neu-lg': '20px'
      }
    },
  },
  plugins: [],
}
