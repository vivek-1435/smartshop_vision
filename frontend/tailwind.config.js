/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        card: '#13131a',
        border: '#2a2a3a',
        accent: '#f97316',
        blue: '#3b82f6',
        green: '#22c55e',
        muted: '#94a3b8',
        input: '#1e1e2e',
      },
      fontFamily: {
        head: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
