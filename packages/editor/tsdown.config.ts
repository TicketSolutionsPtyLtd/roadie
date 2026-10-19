import { defineConfig } from 'tsdown'

// Unbundle mode is load-bearing for RSC safety — see packages/components/tsdown.config.ts.
export default defineConfig(({ watch }) => ({
  entry: ['src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'],
  unbundle: true,
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
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      '@oztix/roadie-core',
      /^@oztix\/roadie-components/
    ]
  }
}))
