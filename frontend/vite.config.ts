import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Vite config for MEMS Frontend.
 *
 * Dev server chạy tại cổng 5173 (localhost:5173) và proxy mọi tiền tố API
 * sang Spring Cloud Gateway. Đặt `VITE_API_PROXY_TARGET` để trỏ host khác.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Tránh watcher quét profile Chrome/cache dùng cho kiểm tra giao diện.
      watch: {
        ignored: ['**/.chrome-profile*/**', '**/.npm-cache/**', '**/coverage/**'],
      },
      proxy: {
        // Backend dùng nhiều tiền tố: Identity dưới /api/v1, People ở gốc,
        // Schedule/Facility dưới /api. Phải proxy đủ để tránh CORS.
        ...Object.fromEntries(
          [
            '/api',
            '/departments',
            '/positions',
            '/permissions',
            '/permission-bundles',
            '/students',
            '/classes',
            '/teachers',
            '/specialties',
            '/transfer-requests',
            '/notifications',
            '/users',
          ].map((prefix) => [
            prefix,
            { target: proxyTarget, changeOrigin: true, secure: false },
          ]),
        ),
      },
    },
    preview: {
      port: 4173,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 900,
    },
  }
})
