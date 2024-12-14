/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    extend: {
        scale: {
          101: '1.01',
          102: '1.02',
          103: '1.03',
        },
      colors: {
        'text-hover': 'var(--text-hover)',
        'text-hover-opposite': 'var(--text-hover-opposite)',
        'text-hover-opposite-d': 'var(--text-hover-opposite-d)',
        'text-hover-darker': 'var(--text-hover-darker)',
        'background': 'var(--background)',
        'background-secondary': 'var(--background-secondary)',
        'background-triary': 'var(--background-triary)',
        'text': 'var(--text)',
        'outline-button': 'var(--outline-button)',
        'text-lighter': 'var(--text-lighter)',
        'border': 'var(--border)',
        'button-cancel': 'var(--button-cancel)',
        'divider': 'var(--divider)',
        'list-hover' : 'var(--list-hover)',
        'green-custom' : 'var(--green)'
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
