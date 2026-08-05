/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#051424',
        surface: {
          DEFAULT: '#122131',
          low: '#0d1c2d',
          lowest: '#010f1f',
          high: '#1c2b3c',
          highest: '#273647',
          bright: '#2c3a4c'
        },
        primary: {
          DEFAULT: '#00d1ff',
          light: '#a4e6ff',
          dark: '#00677f'
        },
        secondary: '#bcc7de',
        borderGlass: 'rgba(255, 255, 255, 0.08)'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
