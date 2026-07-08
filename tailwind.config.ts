import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0E1A",
          panel: "#111527",
          elevated: "#161B2E",
        },
        border: {
          DEFAULT: "#242B45",
        },
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        gold: "#d4af37",
      },
      fontFamily: {
        display: ["Space Grotesk", "Manrope", "system-ui", "sans-serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.75" },
        },
        marketPulse: {
          "0%, 100%": {
            color: "#f87171",
            opacity: "1",
            transform: "scale(1)",
            textShadow: "0 0 0 rgba(248,113,113,0)",
          },
          "50%": {
            color: "#ef4444",
            opacity: "0.92",
            transform: "scale(1.04)",
            textShadow: "0 0 18px rgba(239,68,68,0.5)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        flicker: "flicker 1.4s ease-in-out infinite",
        "market-pulse": "marketPulse 1.8s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
