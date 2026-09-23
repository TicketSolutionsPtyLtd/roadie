import { defineConfig } from 'tsdown'

export default defineConfig(({ watch }) => ({
  entry: {
    index: './src/index.ts',
    'colors/index': './src/colors/index.ts',
    'theme/index': './src/theme/index.ts',
    'utils/index': './src/utils/index.ts',
    'image/index': './src/image/index.ts',
    'datetime/index': './src/datetime/index.ts',
    'dataviz/index': './src/dataviz/index.ts',
    'navigator/index': './src/navigator/index.ts'
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
