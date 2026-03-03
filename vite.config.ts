import { defineConfig } from 'vite'

export default defineConfig({
  base: '/stakka/',
  build: {
    target: 'es2022',
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
