import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Space Grotesk Variable", "sans-serif"],
        display: ["Newsreader Variable", "serif"],
        mono: ["Space Grotesk Variable", "monospace"],
      },
      boxShadow: {
        paper: "0 28px 70px -34px rgba(0, 0, 0, 0.9)",
        lift: "5px 5px 0 rgba(239, 126, 55, 0.22)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(141, 224, 181, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(141, 224, 181, 0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
