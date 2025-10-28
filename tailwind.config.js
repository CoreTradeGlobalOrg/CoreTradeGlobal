/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FDF7E5',
          light: '#FFFDF7',
          dark: '#F5EFD7',
        },
        warmBrown: {
          50: '#FAF5F0',
          100: '#F5EBE0',
          200: '#E8D4BF',
          300: '#DABDA0',
          400: '#CDA682',
          500: '#B88F67',
          600: '#9A7555',
          700: '#7C5D45',
          800: '#5E4635',
          900: '#403027',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}