// Tailwind, built with the site (it used to load from cdn.tailwindcss.com in the browser).
// Same version (3.4.17) and the same settings the CDN had: dark mode by class, no plugins, default theme.
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './*.{ts,tsx}', './components/**/*.{ts,tsx,js}', './lib/**/*.{ts,tsx,js}'],
};
