import { defineConfig } from 'tsdown'

import { skipUnchangedWrites } from '../../scripts/tsdown-watch.mjs'

// One output file per illustration, so a bundler keeps only the ones imported.
export default defineConfig(({ watch }) => ({
  entry: ['src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'],
  unbundle: true,
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
  onSuccess: watch ? 'pnpm generate:manifest' : undefined,
  target: 'es2022',
  minify: true,
  outDir: 'dist',
  outExtensions: () => ({ js: '.js' }),
  plugins: watch ? [skipUnchangedWrites()] : [],
  deps: {
    neverBundle: ['react', 'react-dom', '@oztix/roadie-core']
  }
}))
