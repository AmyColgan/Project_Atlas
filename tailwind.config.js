/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        atlas: {
          bg: "#0b0e14",
          panel: "#131824",
          panelBorder: "#232c3d",
          accent: "#4fd1c5",
          accentWarm: "#e8b34f",
          text: "#dce4f0",
          textDim: "#7d8aa3",
        },
      },
    },
  },
  plugins: [],
};
