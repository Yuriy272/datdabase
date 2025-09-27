/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    '@tailwindcss/postcss': {},   // <- НОВИЙ плагін для Tailwind v4
    autoprefixer: {}
  }
}
