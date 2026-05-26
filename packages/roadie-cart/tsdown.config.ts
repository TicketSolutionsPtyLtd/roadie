import { defineConfig } from 'tsdown'

export default defineConfig(({ watch }) => ({
  entry: ['src/core/index.ts', 'src/react/index.ts', 'src/vue/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  dts: {
    resolve: true,
    compilerOptions: { composite: false, incremental: false }
  },
  sourcemap: true,
  clean: !watch,
  target: 'es2022',
  minify: true,
  shims: true,
  outDir: 'dist',
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      'vue',
      'motion',
      '@number-flow/react',
      'react-focus-lock',
      '@oztix/roadie-core',
      '@oztix/roadie-components'
    ]
  }
}))
