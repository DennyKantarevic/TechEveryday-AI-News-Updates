import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f3eadb",
        ink: "#111111",
        bone: "#fffaf0",
        newsprint: "#ffffff",
        brass: "#b98237",
        sage: "#60715f",
        clay: "#b35b43"
      },
      boxShadow: {
        editorial: "8px 8px 0 #111111",
        soft: "0 18px 45px rgba(17, 17, 17, 0.10)"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
