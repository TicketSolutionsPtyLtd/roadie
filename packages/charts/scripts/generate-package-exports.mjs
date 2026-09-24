#!/usr/bin/env node
// Regenerates package.json's exports from src/*; run after adding/removing a top-level chart piece.
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, '..')
const srcDir = join(packageRoot, 'src')
const packageJsonPath = join(packageRoot, 'package.json')

const EXCLUDE = new Set()

function toKebab(pascal) {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function listSourceFolders() {
  return readdirSync(srcDir)
    .filter((name) => {
      const entry = join(srcDir, name)
      if (!statSync(entry).isDirectory() || !/^[A-Za-z]/.test(name))
        return false
      return (
        existsSync(join(entry, 'index.tsx')) ||
        existsSync(join(entry, 'index.ts'))
      )
    })
    .sort()
}

function buildExports(folders) {
  /** @type {Record<string, { types: string; import: string }>} */
  const exports = {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js'
    },
    './css': {
      style: './src/css/charts.css',
      default: './src/css/charts.css'
    }
  }

  for (const folder of folders) {
    if (EXCLUDE.has(folder)) continue
    const key = `./${toKebab(folder)}`
    exports[key] = {
      types: `./dist/${folder}/index.d.ts`,
      import: `./dist/${folder}/index.js`
    }
  }

  return exports
}

function main() {
  const folders = listSourceFolders()
  const nextExports = buildExports(folders)

  const raw = readFileSync(packageJsonPath, 'utf8')
  const pkg = JSON.parse(raw)
  pkg.exports = nextExports

  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n')

  const entries = Object.keys(nextExports).filter((k) => k !== '.')
  console.log(
    `Regenerated ${entries.length} subpath exports in package.json:\n  ` +
      entries.join('\n  ')
  )
}

main()
