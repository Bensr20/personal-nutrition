import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS+LAN מופעל רק דרך `npm run dev:mobile` (VITE_MOBILE_HTTPS=1) — בדיקת מצלמה בטלפון אמיתי
// דורשת הקשר מאובטח (HTTPS), ו-localhost על המחשב אינו זהה לכתובת IP מקומית ב-HTTP בטלפון.
// ברירת המחדל של `npm run dev` נשארת HTTP רגיל בלי תעודה, כדי לא לשנות התנהגות קיימת.
const mobileHttps = process.env.VITE_MOBILE_HTTPS === '1'

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
    ...(mobileHttps ? { host: true } : {}),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    ...(mobileHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'התזונה שלי',
        short_name: 'התזונה שלי',
        description: 'אפליקציה אישית לניהול תזונה, יומן ארוחות, שתייה, פעילות ומשקל',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#7265E3',
        background_color: '#F5F6FA',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // רק משאבי ממשק ציבוריים - לא לשמור נתונים אישיים/API במטמון
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // מאגר המזונות הישראלי (chunk נפרד, ~3MB) נטען לפי דרישה (dynamic import) ולא
        // כחלק מהרצת האפליקציה הראשונית - נשמר במטמון ריצה (למטה) אחרי טעינה ראשונה במקום precache חוסם.
        globIgnores: ['**/foodCatalogIsraeli-*.js'],
        navigateFallbackDenylist: [/^\/rest\//, /supabase/],
        runtimeCaching: [
          {
            urlPattern: /foodCatalogIsraeli-.*\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'food-catalog-chunk', expiration: { maxEntries: 2 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
})
