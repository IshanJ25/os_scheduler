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
        background: '#f0f0f0',
        text: '#323232',
        'light-blue': '#96C8FF',
        'purple': '#5064B4',
        'pumpkin-orange': '#FF9632',
      },
    },
  },
  plugins: [],
};
export default config;
