/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./index.html"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2b59c3',
        'primary-dark': '#1e40af',
        dark: '#0f172a',
        'dark-lighter': '#1e293b',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
