/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        rippling: {
          "0%": {
            opacity: "1",
          },
          "100%": {
            transform: "scale(2)",
            opacity: "0",
          },
        },
        // ✅ NEW: Added ripple animation for gallery navigation
        ripple: {
          "0%": {
            width: "0px",
            height: "0px",
            opacity: "0.5",
          },
          "100%": {
            width: "400px",
            height: "400px",
            opacity: "0",
          },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "fade-out": "fade-out 1s ease-out forwards",
        rippling: "rippling 0.6s ease-out",
        // ✅ NEW: Added ripple animation
        ripple: "ripple 600ms ease-out",
      },
    },
  },
  plugins: [],
}