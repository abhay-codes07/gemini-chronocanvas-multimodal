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
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: {
          DEFAULT: "#04070d",
          soft: "#0b1220",
          muted: "#1b2738",
        },
        glow: {
          cyan: "#3dd9ff",
          amber: "#f9b85d",
          violet: "#9a8cff",
        },
      },
      boxShadow: {
        aura: "0 0 60px rgba(61, 217, 255, 0.25)",
      },
      backgroundImage: {
        "cinematic-radial":
          "radial-gradient(circle at 20% 20%, rgba(61, 217, 255, 0.2), transparent 35%), radial-gradient(circle at 85% 10%, rgba(154, 140, 255, 0.14), transparent 40%), linear-gradient(160deg, #02050a 0%, #050a13 45%, #0b1220 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
