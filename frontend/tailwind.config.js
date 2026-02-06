/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#0B1C2D',
                accent: '#14726C',
                'accent-soft': 'rgba(20, 114, 108, 0.12)',
                highlight: '#D4AF37',
                'highlight-soft': 'rgba(212, 175, 55, 0.15)',
                background: '#F8F7F4',
                text: '#3A3A3A',
                'gray-light': '#E8EEF5',
                'gray-medium': '#64748B',
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            container: {
                center: true,
                padding: '2rem',
                screens: {
                    '2xl': '1400px',
                },
            },
        },
    },
    plugins: [],
}
