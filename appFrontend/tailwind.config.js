/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#666666',
        background: '#FFFFFF',
        input: '#F8F8F8',
        border: '#DDDDDD',
      },
    },
  },
  plugins: [],
} 