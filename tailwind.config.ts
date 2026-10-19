import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        // Premium TWT Palette
        midnight: "#10182B",
        plum: "#51254F",
        emeraldDeep: "#145447",
        burgundy: "#722F45",
        gold: "#C6A15B",
        ivory: "#F8F4EC",
        champagne: "#E8D8BB",
        charcoal: "#24252B",
        taupe: "#8B8178",
        navy: "#10182B",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: {
        display: ["Playfair Display", "DM Serif Display", "serif"],
        body: ["Inter", "Manrope", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(16,24,43,0.07)",
        card: "0 8px 24px rgba(16,24,43,0.08)",
        premium: "0 16px 40px rgba(16,24,43,0.12)",
        gold: "0 4px 16px rgba(198,161,91,0.18)",
      },
      backgroundImage: {
        "gradient-navy-plum": "linear-gradient(135deg, #10182B 0%, #51254F 100%)",
        "gradient-emerald-navy": "linear-gradient(135deg, #145447 0%, #10182B 100%)",
        "gradient-burgundy-plum": "linear-gradient(135deg, #722F45 0%, #51254F 100%)",
        "gradient-champagne-ivory": "linear-gradient(135deg, #E8D8BB 0%, #F8F4EC 100%)",
        "gradient-navy-gold": "radial-gradient(600px circle at 30% 20%, rgba(198,161,91,0.18), transparent 40%), linear-gradient(135deg,#10182B,#1a2440)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        float: { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "fade-slide-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "reveal": { "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" }, "100%": { opacity: "1", transform: "translateY(0) scale(1)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-slide": "fade-slide-up 0.5s ease-out",
        reveal: "reveal 0.4s ease-out",
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
