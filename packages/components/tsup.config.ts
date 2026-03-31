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
        [dirent.name]: `src/components/${dirent.name}/index.tsx`,
      }),
      {}
    )

  return {
    index: 'src/index.tsx',
    ...components,
  }
}

export default defineConfig({
  entry: getComponentEntries(),
  format: ['esm'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['react', 'react-dom', '@oztix/roadie-core', '@base-ui/react'],
  splitting: true,
  treeshake: {
    preset: 'recommended',
  },
  minify: true,
  outDir: 'dist',
  outExtension: () => ({
    js: '.js',
  }),
  esbuildOptions(options) {
    options.chunkNames = '_chunks/[name]-[hash]'
    options.assetNames = '_assets/[name]-[hash]'
  },
  async onSuccess() {
    const { writeFileSync, readFileSync, readdirSync } = await import('fs')
    const { join } = await import('path')

    const addUseClientToFile = (
      filePath: string,
      visited = new Set<string>()
    ) => {
      if (visited.has(filePath)) return
      visited.add(filePath)

      try {
        const content = readFileSync(filePath, 'utf-8')

        if (!content.startsWith('"use client"')) {
          writeFileSync(filePath, `"use client";\n${content}`)
        }

        const chunkMatches = content.matchAll(
          /(?:from|import)'\.\/(_chunks\/[^']+)'/g
        )
        for (const match of chunkMatches) {
          const chunkPath = join(__dirname, 'dist', match[1])
          addUseClientToFile(chunkPath, visited)
        }
      } catch {
        // File might not exist
      }
    }

    const srcDir = join(__dirname, 'src/components')
    const components = readdirSync(srcDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)

    for (const component of components) {
      const srcPath = join(srcDir, component, 'index.tsx')
      try {
        const srcContent = readFileSync(srcPath, 'utf-8')
        if (srcContent.startsWith("'use client'")) {
          const distPath = join(__dirname, 'dist', `${component}.js`)
          addUseClientToFile(distPath)
        }
      } catch {
        // File might not exist
      }
    }
  },
})
