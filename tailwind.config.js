/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#070b1f",
          panel: "#111933",
          panelSoft: "#182347",
          border: "#2a3a77",
          text: "#e8eeff",
          muted: "#a8b7e6",
          primary: "#5eead4",
          primaryHover: "#2dd4bf",
          accent: "#a78bfa",
          danger: "#fb7185",
        },
      },
      fontFamily: {
        display: ["Exo 2", "Inter", "Segoe UI", "sans-serif"],
        body: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94, 234, 212, 0.35), 0 10px 40px rgba(22, 163, 74, 0.08)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      transitionTimingFunction: {
        game: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      backgroundImage: {
        "brand-gradient":
          "radial-gradient(circle at top right, rgba(167, 139, 250, 0.16), transparent 38%), radial-gradient(circle at 20% 20%, rgba(94, 234, 212, 0.14), transparent 35%)",
      },
    },
  },
  plugins: [],
};
