/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                sidebar: {
                    DEFAULT: '#0B1F3F', // Navy Blue Deep (Be Lean Primary)
                    hover: '#1B3155',   // Lighter Navy
                    active: '#274472',  // Active State
                    text: '#cbd5e1',    // Slate 300 (readable on navy)
                    textActive: '#ffffff',
                    border: '#1e3a8a',  // Blue 900
                },
                brand: {
                    50: '#fff7ed',  // Orange 50
                    100: '#ffedd5', // Orange 100
                    200: '#fed7aa', // Orange 200
                    300: '#fdba74', // Orange 300
                    400: '#fb923c', // Orange 400
                    500: '#f97316', // Orange 500 (Primary Brand Color)
                    600: '#ea580c', // Orange 600
                    700: '#c2410c', // Orange 700
                    800: '#9a3412', // Orange 800
                    900: '#7c2d12', // Orange 900
                    950: '#431407', // Orange 950
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
