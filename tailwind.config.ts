import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        bungee: ['var(--font-bungee)', 'sans-serif'],
      },
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
        background: '#000000', // Branco
        // Tema Neon (verde escuro neon - melhor visibilidade)
        neon: {
          DEFAULT: '#00cc6a',
          dim: '#00b359',
          dark: '#00884d',
          glow: 'rgba(0, 204, 106, 0.4)',
        },
        'neon-bg': {
          DEFAULT: '#0d0d0d',
          card: '#1a1a1a',
          input: '#222222',
        },
        /** Branco neon para landing e destaques (paleta P&B; cor apenas em imagens) */
        'neon-white': {
          DEFAULT: '#f0f9ff',
          dim: '#e0f2fe',
          glow: 'rgba(240, 249, 255, 0.45)',
          glowStrong: 'rgba(240, 249, 255, 0.6)',
        },
      },
      animation: {
        'neon-float': 'neon-float 8s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 3s ease-in-out infinite',
        'grid-flow': 'grid-flow 20s linear infinite',
        'brutalist-glow-white': 'brutalist-glow-white 0.4s ease-out forwards',
        'brutalist-glow-green': 'brutalist-glow-green 0.4s ease-out forwards',
      },
      keyframes: {
        'neon-float': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(12px, -8px) scale(1.05)' },
          '66%': { transform: 'translate(-6px, 6px) scale(0.98)' },
        },
        'neon-pulse': {
          '0%, 100%': { opacity: '0.6', boxShadow: '0 0 20px rgba(0, 204, 106, 0.3)' },
          '50%': { opacity: '1', boxShadow: '0 0 30px rgba(0, 204, 106, 0.5)' },
        },
        'grid-flow': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
        'brutalist-glow-white': {
          '0%': { boxShadow: '0 0 0 0 rgba(240, 249, 255, 0), 0 0 0 2px rgba(240, 249, 255, 0.9)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(240, 249, 255, 0.4), 0 0 0 3px rgba(240, 249, 255, 1)' },
          '100%': { boxShadow: '0 0 28px 6px rgba(240, 249, 255, 0.35), 0 0 0 2px rgba(240, 249, 255, 0.9)' },
        },
        'brutalist-glow-green': {
          '0%': { boxShadow: '0 0 0 0 rgba(0, 204, 106, 0), 0 0 0 2px rgba(0, 204, 106, 0.8)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(0, 204, 106, 0.5), 0 0 0 3px rgba(0, 204, 106, 1)' },
          '100%': { boxShadow: '0 0 28px 6px rgba(0, 204, 106, 0.4), 0 0 0 2px rgba(0, 204, 106, 0.8)' },
        },
      },
      boxShadow: {
        'brutalist-white': '0 0 0 2px rgba(240, 249, 255, 0.9), 0 0 24px rgba(240, 249, 255, 0.25)',
        'brutalist-white-hover': '0 0 0 3px rgba(240, 249, 255, 1), 0 0 32px rgba(240, 249, 255, 0.4)',
        'brutalist-green': '0 0 0 2px rgba(0, 204, 106, 0.8), 0 0 24px rgba(0, 204, 106, 0.2)',
        'brutalist-green-hover': '0 0 0 3px rgba(0, 204, 106, 1), 0 0 32px rgba(0, 204, 106, 0.45)',
      },
    },
  },
  plugins: [],
}
export default config

