import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0a0a0a",
          yellow: "#F5C200",
          "yellow-light": "#FFD700",
          "yellow-dark": "#C49B00",
          white: "#FAFAFA",
          gray: "#1a1a1a",
          "gray-2": "#2a2a2a",
          "gray-3": "#3a3a3a",
          muted: "#6b6b6b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
