/// <reference types="node" />
import { readdirSync } from 'fs'
import { join } from 'path'
import { defineConfig } from 'tsup'

// Dynamically get all component entries
const getComponentEntries = () => {
  const componentsDir = join(__dirname, 'src/components')
  const components = readdirSync(componentsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .reduce(
      (acc, dirent) => ({
        ...acc,
        [dirent.name]: `src/components/${dirent.name}/index.tsx`
      }),
      {}
    )

  return {
    index: 'src/index.tsx',
    ...components
  }
}

export default defineConfig({
  entry: getComponentEntries(),
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['react', '@oztix/roadie-core'],
  splitting: true,
  treeshake: {
    preset: 'recommended'
  },
  minify: true,
  outDir: 'dist',
  outExtension: () => ({
    js: '.js'
  }),
  esbuildOptions(options) {
    options.chunkNames = '_chunks/[name]-[hash]'
    options.assetNames = '_assets/[name]-[hash]'
  }
})
