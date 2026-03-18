/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ana arka plan – tam siyah değil, derin gri (göz yormaz)
        app: '#0F0F0F',
        // Kart ve yüzeyler – derinlik hissi
        surface: '#1E1E1E',
        // Vurgu: Twitch Moru / Kick Yeşili (butonlar, puanlar)
        accent: '#A970FF',
        'accent-green': '#53FC18',
        // Metin
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        // İsteğe bağlı border
        border: '#2A2A2A',
      },
    },
  },
  plugins: [],
};
