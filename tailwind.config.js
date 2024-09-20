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
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
