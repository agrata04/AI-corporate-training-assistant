export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}', './electron/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15202b',
        steel: '#334155',
        brand: '#2563eb',
        mint: '#0f766e',
        ember: '#d97706'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
