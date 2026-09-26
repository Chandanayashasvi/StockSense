/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic palette mapped to the shared StockSense dark theme.
        ink: {
          950: "#07111F",
          900: "#F8FAFC",
          800: "#F1F5F9",
          700: "#CBD5E1",
        },
        steel: {
          50: "#07111F",
          100: "#0D1726",
          200: "#22324A",
          300: "#31445E",
          400: "#CBD5E1",
          500: "#94A3B8",
          600: "#F1F5F9",
        },
        copy: {
          main: "#F1F5F9",
          secondary: "#CBD5E1",
          muted: "#94A3B8",
          placeholder: "#64748B",
        },
        icon: {
          container: "#142236",
          blue: "#60A5FA",
        },
        brand: {
          400: "#22D3EE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#FBBF24",
        },
        signal: {
          green: "#4ADE80",
          red: "#F87171",
          blue: "#60A5FA",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 8px 22px rgba(0, 0, 0, 0.18)",
      },
      borderRadius: {
        md: "8px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
