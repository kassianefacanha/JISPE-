/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jispe: {
          green: '#1E7D4F',
          orange: '#E8862A',
          white: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};
