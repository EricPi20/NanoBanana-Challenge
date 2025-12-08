import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        banana: {
          50: '#fffef0',
          100: '#fffbd1',
          200: '#fff5a3',
          300: '#ffed75',
          400: '#ffe247',
          500: '#ffd700',
          600: '#e6c200',
          700: '#ccad00',
          800: '#b39800',
          900: '#998300',
        },
      },
    },
  },
  plugins: [],
}
export default config

