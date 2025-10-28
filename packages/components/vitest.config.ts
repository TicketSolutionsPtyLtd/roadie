import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    fs: {
      allow: ['../..']
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true
  },
  ssr: {
    noExternal: ['@oztix/roadie-core']
  }
})
