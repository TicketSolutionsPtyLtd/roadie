import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'tsdown'

import { reactCompilerPreset } from './react-compiler.config.ts'

// Unbundle mode is load-bearing for RSC safety, and keeps 'use client' per file
// so its warning is noise — see packages/components/tsdown.config.ts.
export default defineConfig(({ watch }) => ({
  entry: ['src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}', '!**/testUtils.ts'],
  unbundle: true,
  suppressWarnings: 'module level directive "use client"',
  // With one subpath, the common base would be src/schema and drop it from dist.
  root: 'src',
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
  onSuccess: watch ? 'pnpm generate:manifest' : undefined,
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
      /^@oztix\/roadie-components/,
      'html-to-text',
      'mjml'
    ]
  }
}))
