import { defineConfig } from 'tsup'

export default defineConfig(({ watch }) => ({
  entry: {
    index: './src/index.ts',
    'colors/index': './src/colors/index.ts',
    'theme/index': './src/theme/index.ts',
    'utils/index': './src/utils/index.ts'
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
  external: ['react', 'react-dom'],
  outExtension: () => ({
    js: '.js'
  })
}))
