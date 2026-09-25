import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'tsdown'

import { reactCompilerPreset } from './react-compiler.config.ts'

// Unbundle mode is load-bearing for RSC safety — see packages/components/tsdown.config.ts.
export default defineConfig(({ watch }) => ({
  entry: ['src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}', '!**/testUtils.ts'],
  unbundle: true,
  format: ['esm'],
  platform: 'neutral',
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  sourcemap: true,
  clean: !watch,
  target: 'es2022',
  minify: true,
  shims: true,
  outDir: 'dist',
  outExtensions: () => ({ js: '.js' }),
  plugins: [babel({ presets: [reactCompilerPreset] })],
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      '@oztix/roadie-core',
      /^@oztix\/roadie-components/
    ]
  }
}))
