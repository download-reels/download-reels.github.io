/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./js/**/*.js"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: '#27272a',
        input: '#27272a',
        ring: '#d4d4d8',
        background: '#09090b',
        foreground: '#fafafa',
        primary: {
          DEFAULT: '#fafafa',
          foreground: '#09090b',
        },
        secondary: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        destructive: {
          DEFAULT: '#7f1d1d',
          foreground: '#fecaca',
        },
        muted: {
          DEFAULT: '#27272a',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        card: {
          DEFAULT: '#18181b',
          foreground: '#fafafa',
        },
      },
    },
  },
  plugins: [],
}

