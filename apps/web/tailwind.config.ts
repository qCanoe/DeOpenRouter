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
    },
  },
  plugins: [],
};
export default config;
