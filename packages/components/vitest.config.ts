import babel from '@rolldown/plugin-babel'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { reactCompilerPreset } from './react-compiler.config.ts'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset] })],
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
    globals: true,
    // Stubbed CSS would make `pane-columns.css?raw` empty.
    css: { include: [/pane-columns\.css/] }
  },
  ssr: {
    noExternal: ['@oztix/roadie-core']
  }
})
