/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#F5F1E8',
        moss: '#3D4A34',
        tobacco: '#8B5A2B',
        ink: '#2B2620',
        amber: '#C08A3E',
      },
      fontFamily: {
        serif: ['Fraunces'],
        sans: ['Inter'],
      },
    },
  },
  plugins: [],
};
