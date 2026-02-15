/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Chat mode: warm, inviting, soft
                chat: {
                    primary: '#3B82F6',
                    secondary: '#8B5CF6',
                    accent: '#F59E0B',
                    bg: '#FAFBFC',
                    surface: '#FFFFFF',
                    text: '#1F2937',
                    muted: '#6B7280',
                    border: '#E5E7EB',
                },
                // Agent mode: technical, deep, focused
                agent: {
                    primary: '#10B981',
                    secondary: '#059669',
                    accent: '#06B6D4',
                    bg: '#0C0C0C',
                    surface: '#161616',
                    surfaceAlt: '#1F1F1F',
                    text: '#F3F4F6',
                    muted: '#9CA3AF',
                    border: '#262626',
                },
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Consolas', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            boxShadow: {
                'glow-chat': '0 0 20px rgba(59, 130, 246, 0.15)',
                'glow-agent': '0 0 20px rgba(16, 185, 129, 0.15)',
            },
        },
    },
    plugins: [],
}
