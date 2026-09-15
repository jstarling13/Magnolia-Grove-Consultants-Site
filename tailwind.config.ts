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
        // Light system — the site's base surface. Mirrors the onyx tiers
        // (DEFAULT = page bg, 100 = card/panel, 200 = deeper well) so the
        // two systems can swap 1:1 in components that flip light/dark.
        // Neutral off-whites, not cream/tan — depth comes from shadow and
        // tonal steps, not warmth.
        cream: {
          DEFAULT: "#ffffff",
          100: "#f6f5f3",
          200: "#eae8e3",
          dark: "#eeece4",
        },
        accent: {
          DEFAULT: "#c9a45c",
          light: "#e0c384",
          dark: "#a9832f",
        },
        // Dark accent system — header, footer, hero bands, and closing CTAs.
        // Also doubles as the site's ink color (text-onyx) for dark text on
        // light/gold surfaces.
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
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        heading: [
          "var(--font-heading)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 17, 12, 0.04), 0 8px 24px -8px rgba(20, 17, 12, 0.12)",
        "card-hover": "0 4px 8px rgba(20, 17, 12, 0.06), 0 16px 40px -10px rgba(20, 17, 12, 0.18)",
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
