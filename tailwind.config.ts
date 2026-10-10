import type { Config } from 'tailwindcss';

/**
 * Design tokens taken from the Figma blueprint (Clinical Doctor Dashboard + Sign In frames).
 * NOTE: we keep the `brand` key so existing pages (bg-brand-600, text-brand-700...)
 * keep working. Only the colour VALUES change.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // `var(--font-inter)` is set in layout.tsx with next/font (see step notes).
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff4ff',
          100: '#dce9ff',
          200: '#b7d8f0',
          300: '#7cc0e6',
          400: '#38a3d8',
          500: '#007bb9', // active nav item
          600: '#006194', // primary buttons / links
          700: '#004e78',
          800: '#003d5e',
          900: '#002c44',
          950: '#001b2b',
        },
        // Text colours
        ink: {
          DEFAULT: '#0b1c30', // main text
          muted: '#3f4850', // labels, secondary text
          faint: '#727780', // hints
        },
        // Page + card surfaces (light blue-tinted greys from Figma)
        surface: {
          DEFAULT: '#f8f9ff', // page background
          low: '#eff4ff',
          mid: '#e5eeff',
          high: '#dce9ff',
        },
        // Danger = critical alerts only. Keep red rare so it always stands out.
        danger: {
          DEFAULT: '#ba1a1a',
          soft: '#ffdad6',
          ink: '#93000a',
        },
        // Warning (amber) and success (green) are used with icon + label, never colour alone.
        warn: {
          DEFAULT: '#b45309',
          soft: '#fef3c7',
          ink: '#78350f',
          line: '#fcd34d',
        },
        ok: {
          DEFAULT: '#047857',
          soft: '#ecfdf5',
          line: '#a7f3d0',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        pop: '0 20px 25px -5px rgb(226 232 240 / 0.5), 0 8px 10px -6px rgb(226 232 240 / 0.5)',
      },
      borderRadius: {
        // Figma uses small radii: 2px chips, 4px buttons/nav, 8px cards.
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
