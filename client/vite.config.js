import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_API_URL', 'VITE_BASE_PATH'])
  const base = env.VITE_BASE_PATH || '/ContextifyAI/client/dist/'

  return {
    // Keep the XAMPP subdirectory as the local default; production sets this to '/'.
    base,
    // Only the two intended public settings are exposed; private .env values are not bundled.
    envPrefix: '__CONTEXTIFY_NO_AUTOMATIC_ENV__',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api'),
      'import.meta.env.VITE_BASE_PATH': JSON.stringify(base),
    },
    plugins: [react(), tailwindcss()],
    build: {
      // Keep generated Laravel-served assets separate from Laravel's own /build files.
      assetsDir: 'contextify-assets',
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
