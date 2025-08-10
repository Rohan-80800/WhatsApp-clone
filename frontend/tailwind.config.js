/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "wa-header": "var(--wa-header)",
        "wa-bg": "var(--wa-bg)",
        "wa-bg-panel": "var(--wa-bg-panel)",
        "wa-bg-secondary": "var(--wa-bg-secondary)",
        "wa-text": "var(--wa-text)",
        "wa-text-muted": "var(--wa-text-muted)",
        "wa-green": "var(--wa-green)",
        "wa-green-dark": "var(--wa-green-dark)",
        "wa-hover": "var(--wa-hover)",
        "wa-border": "var(--wa-border)"
      }
    }
  },
  plugins: []
};

