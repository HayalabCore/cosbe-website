/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-poppins)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          'sans-serif',
        ],
      },
      colors: {
        /* ── Primary Colors ── */
        primaryColor: '#549FE3',
        primaryHover: '#4589CC',
        primaryLight: '#6FAFE8',
        primaryDark: '#3A7AB8',

        /* ── Background Colors ── */
        bgPrimary: '#FFFFFF',
        bgSecondary: '#F9FAFB',
        bgTertiary: '#F3F4F6',
        bgAccent: '#EBF7FF',

        /* ── Text Colors ── */
        textPrimary: '#111827',
        textSecondary: '#374151',
        textTertiary: '#6B7280',
        textDisabled: '#9CA3AF',
        textHeading: '#0F172A',
        textBody: '#334155',

        /* ── Border Colors ── */
        borderPrimary: '#E5E7EB',
        borderSecondary: '#D1D5DB',
        borderDark: '#1F2937',

        /* ── Status Colors ── */
        successColor: '#22C55E',
        errorColor: '#EF4444',
        warningColor: '#F59E0B',
      },
    },
  },
  plugins: [],
};
