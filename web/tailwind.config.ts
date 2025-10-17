import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#edf2ff",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb"
        }
      }
    }
  },
  plugins: []
};

export default config;
