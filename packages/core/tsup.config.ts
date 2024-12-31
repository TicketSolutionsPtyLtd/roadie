import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'presets/index': './src/presets/index.ts'
  },
  splitting: false,
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  bundle: true,
  external: ['@pandacss/dev'],
  onSuccess: 'pnpm run build:panda',
  ignoreWatch: ['src/tokens/tokens.json', 'src/tokens/semantic-tokens.json'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.js'
  })
})
