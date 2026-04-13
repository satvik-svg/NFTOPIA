/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        nft: {
          primary: '#0F172A',
          'primary-light': '#334155',
          'primary-dark': '#020617',
          secondary: '#64748B',
          'secondary-light': '#94A3B8',
          dark: '#1A1A2E',
          darker: '#111827',
          card: '#FFFFFF',
          surface: '#F8FAFB',
          'surface-alt': '#F1F5F9',
          border: '#E2E8F0',
          'border-light': '#F8FAFC',
          success: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          muted: '#64748B',
          text: '#0F172A',
          'text-secondary': '#475569',
          'text-light': '#94A3B8'
        }
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #F8FAFB 0%, #F1F5F9 30%, #E2E8F0 60%, #F8FAFB 100%)',
        'hero-mesh': 'radial-gradient(circle at 20% 30%, rgba(15,23,42,.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(100,116,139,.03) 0%, transparent 45%)',
        'card-hover': 'linear-gradient(135deg, rgba(15,23,42,.02), rgba(100,116,139,.02))'
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
        'card-lg': '0 20px 40px rgba(0,0,0,0.08)',
        'btn': '0 4px 14px rgba(15,23,42,0.2)',
        'btn-hover': '0 6px 20px rgba(15,23,42,0.3)',
        'float': '0 20px 60px rgba(0,0,0,0.08)'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'fade-up': 'fadeUp 0.8s ease-out both',
        'fade-up-delay': 'fadeUp 0.8s ease-out 0.2s both',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'bounce-dot': 'bounceDot 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.2s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' }
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        },
        bounceDot: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
};
