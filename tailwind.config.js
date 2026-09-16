/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Rubik', 'Heebo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // רקע אפור-לבנדר בהיר וכרטיסים לבנים — בהשראת הרפרנס החזותי
        bg: {
          DEFAULT: '#F4F6FA',
          soft: '#EEF0F7',
        },
        surface: '#FFFFFF',
        ink: {
          900: '#151627',
          700: '#2B2D42',
          // 600: טקסט/אייקונים קטנים שצריכים לעמוד ביחס ניגודיות נגיש (~6.1:1 על לבן) —
          // ink-500 (~4.2:1) ו-ink-400 (~2.4:1) לא מספיקים לטקסט קטן/אייקון פעולה.
          600: '#5B6178',
          500: '#737B95',
          400: '#A2A8BD',
          200: '#E3E5EF',
        },
        border: '#EBEDF5',
        // סגול ראשי — כפתורים, בחירות, מצבים פעילים
        primary: {
          50: '#EEECFC',
          100: '#DBD7FA',
          200: '#B8B0F4',
          300: '#9A90EF',
          400: '#8577EA',
          500: '#7265E3',
          600: '#5D4FD1',
          700: '#4B3EB8',
        },
        // צבעי הבחנה בין מדדים
        teal: { 100: '#DDF7FC', 500: '#22C7EA', 600: '#0EA5C4' },
        orange: { 100: '#FFE9DB', 500: '#FF934E', 600: '#F2762A' },
        gold: { 100: '#FFF3D6', 500: '#FFC542', 600: '#E9A916' },
        mint: { 100: '#DEF7E8', 500: '#3FCC7E', 600: '#2BAE68' },
        coral: { 50: '#FDECEE', 100: '#FBDCE0', 500: '#F0546C', 600: '#D63F57' },
      },
      borderRadius: {
        control: '16px',
        card: '24px',
        chip: '20px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 2px 6px rgba(20,21,43,0.04), 0 12px 28px -12px rgba(20,21,43,0.12)',
        pop: '0 4px 10px rgba(20,21,43,0.06), 0 20px 40px -14px rgba(20,21,43,0.20)',
      },
      fontSize: {
        display: ['1.75rem', { lineHeight: '2.15rem', fontWeight: '700', letterSpacing: '-0.01em' }],
        title: ['1.375rem', { lineHeight: '1.75rem', fontWeight: '700', letterSpacing: '-0.005em' }],
        subtitle: ['1.0625rem', { lineHeight: '1.5rem', fontWeight: '700' }],
        body: ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        caption: ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        micro: ['0.6875rem', { lineHeight: '1rem', fontWeight: '600', letterSpacing: '0.03em' }],
      },
      spacing: {
        18: '4.5rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.97)', opacity: '0.6' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'ring-draw': {
          '0%': { strokeDashoffset: 'var(--ring-circumference)' },
          '100%': { strokeDashoffset: 'var(--ring-offset)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'pop': 'pop 0.18s ease-out',
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'ring-draw': 'ring-draw 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
    },
  },
  plugins: [],
}
