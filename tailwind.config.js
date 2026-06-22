/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        kesco: {
          yellow: "#F5C400",
          gold: "#E6B800",
          dark: "#1A1A1A",
          gray: "#6B7280",
          light: "#FFFBEA",
          card: "rgba(255,255,255,0.85)",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

