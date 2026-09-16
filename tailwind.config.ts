import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ---------- Semantic tokens (mapped to CSS vars) ---------- */
        background: "var(--bg-page)",
        foreground: "var(--text-primary)",
        surface: {
          DEFAULT: "var(--surface)",
          secondary: "var(--surface-2)",
          tertiary: "var(--surface-3)",
        },
        border: {
          DEFAULT: "var(--border)",
          soft: "var(--border-soft)",
        },
        text: {
          DEFAULT: "var(--text-body)",
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
        },

        /* ---------- Brand ---------- */
        brand: {
          DEFAULT: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          soft: "var(--brand-primary-soft)",
          tint: "var(--brand-primary-tint)",
        },
        primary: {
          DEFAULT: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          glow: "var(--brand-primary-soft)",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "var(--brand-accent)",
          soft: "var(--brand-accent-soft)",
          foreground: "#ffffff",
        },

        /* ---------- Feedback ---------- */
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
        },
        error: {
          DEFAULT: "var(--error)",
          soft: "var(--error-soft)",
        },
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
        },

        /* ---------- Legacy aliases (do not remove) ---------- */
        secondary: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--error)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--surface-3)",
          foreground: "var(--text-muted)",
        },
        popover: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-primary)",
        },
        page: {
          light: "var(--bg-page)",
          dark: "var(--text-primary)",
        },
        glass: {
          light: "rgba(255,255,255,0.6)",
          dark: "rgba(28,25,23,0.6)",
        },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "calc(var(--radius-xl) + 4px)",
        "3xl": "calc(var(--radius-xl) + 8px)",
        pill: "var(--radius-pill)",
        full: "9999px",
      },
      boxShadow: {
        "1": "var(--shadow-1)",
        "2": "var(--shadow-2)",
        "3": "var(--shadow-3)",
        "4": "var(--shadow-4)",
        "5": "var(--shadow-5)",
        sm: "var(--shadow-1)",
        DEFAULT: "var(--shadow-2)",
        md: "var(--shadow-3)",
        lg: "var(--shadow-4)",
        xl: "var(--shadow-5)",
        /* Legacy */
        glass: "var(--shadow-3)",
        "glass-dark": "var(--shadow-3)",
        glow: "0 0 20px rgba(6, 182, 212, 0.2)",
        "glow-accent": "0 0 20px rgba(16, 185, 129, 0.2)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-vazirmatn)",
          "var(--font-noto-kufi)",
          "system-ui",
          "Segoe UI",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-inter)",
          "var(--font-vazirmatn)",
          "var(--font-noto-kufi)",
          "system-ui",
          "sans-serif",
        ],
      },
      backdropBlur: {
        glass: "12px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-hover) 100%)",
        "gradient-accent": "linear-gradient(135deg, var(--brand-accent) 0%, #059669 100%)",
        "gradient-glow": "radial-gradient(circle at center, var(--brand-primary-soft) 0%, transparent 70%)",
      },
      keyframes: {
        "gjm-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "gjm-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "gjm-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "gjm-spin": "gjm-spin 1s linear infinite",
        "gjm-pulse": "gjm-pulse 2s ease-in-out infinite",
        "gjm-float": "gjm-float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
