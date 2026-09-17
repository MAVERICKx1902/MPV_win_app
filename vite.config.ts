import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Vite config tuned for both the plain web preview and the future Tauri 2.0
 * shell: the dev server binds to 0.0.0.0 with permissive hosts so a sandboxed
 * preview URL (or a phone on the LAN for the Android build) can reach it.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  // Tauri expects a fixed dev port and a predictable dist folder.
  clearScreen: false,
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
})
