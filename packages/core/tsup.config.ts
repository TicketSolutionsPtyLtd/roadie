import { defineConfig } from 'tsup'

export default defineConfig(({ watch }) => ({
  entry: {
    index: './src/index.ts',
    'presets/index': './src/presets/index.ts'
  },
  splitting: false,
  format: ['esm'],
  minify: !watch,
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  clean: !watch,
  bundle: true,
  external: ['@pandacss/dev', 'react', 'react-dom'],
  noExternal: ['@pandacss/dev'],
  outExtension: () => ({
    js: '.js'
  })
}))
