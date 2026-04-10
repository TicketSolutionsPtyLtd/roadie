import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

// NOTE: Rolldown (tsdown's backend) preserves module-level "use client"
// directives on entry outputs natively, so we no longer need the post-build
// hook that previously re-inserted them. Verify after build with:
//   head -c 13 dist/Select.js   # → "use client";
export default defineConfig({
  entry: getComponentEntries(),
  format: ['esm'],
  platform: 'neutral',
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
  minify: true,
  shims: true,
  outDir: 'dist',
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      '@oztix/roadie-core',
      '@ark-ui/react',
      '@base-ui/react',
      '@phosphor-icons/react'
    ]
  }
})
