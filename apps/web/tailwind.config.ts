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
        background: "var(--background)",
        foreground: "var(--foreground)",
        theme: "var(--border)",
        muted: "var(--muted)",
        inverse: "var(--inverse-bg)",
        "inverse-fg": "var(--inverse-fg)",
      },
      keyframes: {
        "toast-in": {
          "0%": { opacity: "0", transform: "translate(-50%, 1rem) scale(0.95)" },
          "100%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
        },
      },
      animation: {
        "toast-in": "toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
