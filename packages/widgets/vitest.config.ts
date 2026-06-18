import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), vue()],
  resolve: { dedupe: ['react', 'react-dom', 'vue'] },
  server: { fs: { allow: ['../..'] } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // React + Base UI Popover transitions + async refetch run slowly in jsdom;
    // the heavier cart-drawer flows brush past the 5s default on slower CI
    // runners (locally ~3-5s). 15s gives headroom without masking a real hang.
    testTimeout: 15000
  },
  ssr: { noExternal: ['@oztix/roadie-core'] }
})
