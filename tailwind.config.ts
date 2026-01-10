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
        primary: {
          DEFAULT: '#1e3a5f', // Azul marinho
          dark: '#152a47',
          light: '#2a4d7a',
        },
        secondary: {
          DEFAULT: '#6b7280', // Cinza
          dark: '#4b5563',
          light: '#9ca3af',
        },
        background: '#ffffff', // Branco
      },
    },
  },
  plugins: [],
}
export default config

