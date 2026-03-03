import { defineConfig } from 'vite'

export default defineConfig({
  base: '/stakka/',
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
