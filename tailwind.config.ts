import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        muted: "#60646c",
        line: "#d9dee7",
        panel: "#f7f8fa",
        brand: "#0f766e",
        accent: "#b45309"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 24, 40, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
