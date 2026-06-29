/** @type {import('tailwindcss').Config} */
export default {
  content: ['./dashboard/index.html', './dashboard/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        surface: {
          0: '#0a0a0f',
          1: '#101018',
          2: '#16161f',
          3: '#1e1e2a',
          4: '#262635',
        },
        accent: {
          cyan: '#00e5ff',
          rose: '#ff3d71',
          amber: '#ffb300',
          green: '#00e676',
        },
        muted: '#6b7094',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-up': 'slideUp 0.5s ease-out both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
