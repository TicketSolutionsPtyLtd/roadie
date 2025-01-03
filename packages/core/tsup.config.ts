import { defineConfig } from 'tsup'

export default defineConfig(({ watch }) => ({
  entry: {
    index: './src/index.ts',
    'presets/index': './src/presets/index.ts'
  },
  splitting: false,
  format: ['esm', 'cjs'],
  dts: true,
  clean: !watch,
  bundle: true,
  external: ['@pandacss/dev', 'react', 'react-dom'],
  noExternal: ['@pandacss/dev'],
  ignoreWatch: ['src/tokens/tokens.json', 'src/tokens/semantic-tokens.json'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.js'
  })
}))
