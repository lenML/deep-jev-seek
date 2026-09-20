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
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {
        sans: ["Space Grotesk Variable", "sans-serif"],
        display: ["Newsreader Variable", "serif"],
        mono: ["Space Grotesk Variable", "monospace"]
      },
      boxShadow: {
        paper: "0 20px 50px -28px rgba(28, 38, 31, 0.42)",
        lift: "6px 6px 0 rgba(24, 31, 27, 0.12)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(23, 35, 28, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(23, 35, 28, 0.055) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
} satisfies Config;
