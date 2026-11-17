import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'tsdown'

import {
  cacheTransforms,
  skipUnchangedWrites
} from '../../scripts/tsdown-watch.mjs'
import { reactCompilerPreset } from './react-compiler.config.ts'

// Unbundle mode is load-bearing for RSC safety, and keeps 'use client' per file
// so its warning is noise — see packages/components/tsdown.config.ts.
export default defineConfig(({ watch }) => ({
  entry: [
    'src/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/fixtures.{ts,tsx}',
    '!src/_test/**'
  ],
  unbundle: true,
  suppressWarnings: 'module level directive "use client"',
  format: ['esm'],
  platform: 'neutral',
  // The docs dev server reads only JS, so watch skips the declarations.
  dts: !watch && {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  sourcemap: true,
  clean: !watch,
  // The docs' API reference reads the manifest, so props stay live in dev.
  onSuccess: watch ? 'pnpm generate:manifest' : undefined,
  target: 'es2022',
  minify: true,
  shims: true,
  outDir: 'dist',
  outExtensions: () => ({ js: '.js' }),
  plugins: watch
    ? [
        cacheTransforms(babel({ presets: [reactCompilerPreset] })),
        skipUnchangedWrites()
      ]
    : [babel({ presets: [reactCompilerPreset] })],
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      '@oztix/roadie-core',
      /^@oztix\/roadie-components/,
      /^@oztix\/roadie-illustrations/
    ]
  }
}))
