/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind v4 reads tokens from src/index.css @theme — this file documents the system
  // and keeps tooling (IDE, plugins) in sync. Do not duplicate colors here; they live in CSS vars.
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope Variable", "ui-sans-serif", "system-ui"],
        display: ["Fraunces Variable", "Manrope Variable", "serif"],
        mono: ["JetBrains Mono Variable", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        modal: "var(--radius-modal)",
        toast: "var(--radius-toast)",
        tooltip: "var(--radius-tooltip)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
        toast: "var(--shadow-toast)",
        modal: "var(--shadow-modal)",
        tooltip: "var(--shadow-tooltip)",
      },
      colors: {
        brand: {
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          900: "var(--color-brand-900)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
      },
    },
  },
};
