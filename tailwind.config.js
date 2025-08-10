module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      colors: {
        n8n: {
          bg: "#0b0f19",
          card: "#11162a",
          stroke: "#202642",
          accent: "#6D4BE0",
          accent2: "#FF7A18",
          text: "#D9E1FF",
          soft: "#a2a9c9"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,.45)",
        neon: "0 0 0 1px rgba(109,75,224,.35), 0 8px 30px rgba(109,75,224,.25)",
      },
      borderRadius: { xl2: "1.25rem" }
    },
  },
  plugins: [],
};