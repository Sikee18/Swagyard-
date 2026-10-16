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
        brand: {
          blue: '#111111',
          'blue-hover': '#262626',
          'blue-light': '#FAF7F2',
          'blue-surface': '#F1EBE0',
          gold: '#C9B79C',
          'gold-rich': '#C9B79C',
          'gold-deep': '#7A6A4F',
          'gold-hover': '#A8946F',
          'gold-glow': '#F1EBE0',
          'gold-border': '#C9B79C',
          surface: '#FAF7F2',
          'text-dark': '#1F1F1F',
          'text-muted': '#6B7280',
        },
        borderLight: '#DDD2BE',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'var(--font-outfit)', 'var(--font-tamil)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cinzel)', 'serif'],
        tamil: ['var(--font-tamil)', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'gold-glow': '0 0 40px 0 rgba(201, 183, 156, 0.15), 0 20px 50px 0 rgba(0, 0, 0, 0.5)',
        'card-subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        soft: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        card: '12px',
        'brand-xs': '3.745px',
        'brand-sm': '5.6175px',
        'brand-md': '7.49px',
        'brand-lg': '11.235px',
        'brand-xl': '14.98px',
        'brand-2xl': '22.47px',
      },
    },
  },
  plugins: [],
};
