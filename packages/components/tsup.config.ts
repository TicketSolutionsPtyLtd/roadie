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
    'hooks/index': 'src/hooks/index.ts',
    ...components
  }
}

export default defineConfig({
  entry: getComponentEntries(),
  format: ['esm'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['react', '@oztix/roadie-core'],
  splitting: false,
  treeshake: true,
  minify: false,
  outDir: 'dist',
  outExtension: () => ({
    js: '.js'
  }),
  async onSuccess() {
    const { readFileSync, writeFileSync, readdirSync } = await import('fs')
    const { join } = await import('path')

    const distDir = join(__dirname, 'dist')
    const files = readdirSync(distDir).filter(
      (file) => file.endsWith('.js') && file !== 'index.js'
    )

    files.forEach((file) => {
      const filePath = join(distDir, file)
      const content = readFileSync(filePath, 'utf-8')
      if (!content.startsWith('"use client"')) {
        writeFileSync(filePath, `"use client";\n${content}`)
      }
    })
  }
})
