import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#080C16',
        surface: '#0F172A',
        card: '#1E293B',
        cardHover: '#27354E',
        accent: {
          primary: '#6366F1',
          secondary: '#06B6D4',
          glow: 'rgba(99, 102, 241, 0.25)',
        },
        state: {
          success: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(99, 102, 241, 0.4)',
        glowEmerald: '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        glowRose: '0 0 25px -5px rgba(239, 68, 68, 0.4)',
      },
    },
  },
  plugins: [],
} satisfies Config;
