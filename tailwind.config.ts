import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1b3b2b",
          50: "#f2f6f4",
          100: "#e0eae4",
          200: "#c1d5c9",
          300: "#96b6a4",
          400: "#67927c",
          500: "#457560",
          600: "#335c4b",
          700: "#294a3d",
          800: "#1b3b2b",
          900: "#152f23",
          950: "#0b1a13",
        },
        charcoal: {
          DEFAULT: "#26302c",
          light: "#4a5650",
        },
        cream: {
          DEFAULT: "#f7f5f0",
          dark: "#eeece4",
        },
        accent: {
          DEFAULT: "#c9a45c",
          light: "#e0c384",
          dark: "#a9832f",
        },
        // Dark/gold system used by the 4 Pillars hub + sub-pages.
        onyx: {
          DEFAULT: "#000000",
          100: "#181818",
          200: "#121212",
        },
        gold: {
          DEFAULT: "#c4a878",
          bright: "#d4bc96",
          dark: "#a48a5e",
        },
        muted: {
          DEFAULT: "#cccccc",
          light: "#e5e5e5",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        heading: [
          "var(--font-heading)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 4px 20px -4px rgba(27, 59, 43, 0.12)",
        "card-hover": "0 12px 32px -8px rgba(27, 59, 43, 0.22)",
      },
      maxWidth: {
        "8xl": "90rem",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
