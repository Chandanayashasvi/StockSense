/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warehouse-inspired palette: slate steel + safety-amber accent.
        ink: {
          950: "#0B1220",
          900: "#0F172A",
          800: "#16233B",
          700: "#1F2E4A",
        },
        steel: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
        },
        amber: {
          400: "#F5A524",
          500: "#E8930C",
          600: "#D97706",
          700: "#B45A05",
        },
        signal: {
          green: "#16A34A",
          red: "#DC2626",
          blue: "#2563EB",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04)",
      },
      borderRadius: {
        md: "8px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
