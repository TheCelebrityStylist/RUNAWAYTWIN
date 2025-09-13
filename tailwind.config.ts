import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        rt: {
          black: "#0A0A0A",
          charcoal: "#444444",
          ivory: "#FAFAF8",
          blush: "#F7E6DD",
          gold: "#D4AF37"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        soft: "0 6px 24px rgba(10,10,10,0.06)"
      },
      fontFamily: {
        display: ["ui-serif", "Georgia", "Times", "serif"],
        body: ["ui-sans-serif", "system-ui", "Helvetica", "Arial", "sans-serif"]
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};
export default config;
