export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      colors: {
        ink: "#10201c",
        mint: "#4fb286",
        coral: "#f9735b",
        gold: "#f4b942",
        skyglass: "#e9f7ff"
      },
      boxShadow: {
        soft: "0 16px 50px rgba(16, 32, 28, 0.12)"
      }
    }
  },
  plugins: []
};
