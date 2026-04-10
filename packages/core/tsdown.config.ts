import { defineConfig } from 'tsdown'

export default defineConfig(({ watch }) => ({
  entry: {
    index: './src/index.ts',
    'colors/index': './src/colors/index.ts',
    'theme/index': './src/theme/index.ts',
    'utils/index': './src/utils/index.ts'
  },
  format: ['esm'],
  minify: !watch,
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  clean: !watch,
  outExtensions: () => ({ js: '.js' })
}))
