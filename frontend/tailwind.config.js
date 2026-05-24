export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Outfit", "Inter", "ui-sans-serif"],
      },
      colors: {
        neon: "#adff44",
        mint: "#adff44",
        ink: "#000000",
        surface: {
          0: "#000000",
          1: "#0a0a0a",
          2: "#111111",
          3: "#1a1a1a",
          4: "#1f1f1f",
        },
        muted: {
          DEFAULT: "#8a8a8a",
          light: "#bdbdbd",
        },
        coral: "#ff6b6b",
        gold: "#ffd700",
      },
      boxShadow: {
        soft: "0 16px 50px rgba(16, 32, 28, 0.12)",
        glow: "0 0 20px rgba(173, 255, 68, 0.25), 0 0 40px rgba(173, 255, 68, 0.10)",
        "glow-sm": "0 0 10px rgba(173, 255, 68, 0.2)",
        "glow-lg": "0 0 30px rgba(173, 255, 68, 0.35), 0 0 60px rgba(173, 255, 68, 0.15)",
        "card": "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.6), 0 0 20px rgba(173,255,68,0.12)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin 8s linear infinite",
        "orb-pulse": "orb-pulse 3s ease-in-out infinite",
        "bounce-dot": "bounce-dot 1.4s ease-in-out infinite",
        "count-up": "count-up 0.5s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(173,255,68,0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(173,255,68,0.6), 0 0 60px rgba(173,255,68,0.2)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "orb-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.08)", opacity: "1" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "scale(0)", opacity: "0.3" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
