import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Vite config for MEMS Frontend v2.
 *
 * The dev server proxies `/api` to the Spring Cloud Gateway so the browser only
 * ever talks to one origin. Set `VITE_API_PROXY_TARGET` to point at another host.
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
      port: 5174,
      strictPort: false,
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
      port: 4174,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 900,
    },
  }
})
