#!/usr/bin/env node
// Regenerates the `exports` block in packages/components/package.json from
// the components folder. Run this after adding or removing a component.
//
// Source of truth: packages/components/src/components/*
// Targets:         packages/components/package.json → "exports"
//
// The tsdown build already picks up every component folder automatically
// (see packages/components/tsdown.config.ts), so this script only touches
// package.json. Dist filenames are PascalCase (matching the folder name).
// Subpath keys are kebab-case (matching Base UI's consumer surface).
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, '..')
const componentsDir = join(packageRoot, 'src/components')
const packageJsonPath = join(packageRoot, 'package.json')

// Components intentionally excluded from subpath exports:
// - Indicator: internal after Phase 10 M8; consumed via Field / Select / RadioGroup.
// - SpotIllustration: tracked in a separate plan; retains its own legacy
//   `./spot-illustrations` subpath key for backwards compatibility.
const EXCLUDE = new Set(['Indicator', 'SpotIllustration'])

function toKebab(pascal) {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function listComponentFolders() {
  return readdirSync(componentsDir)
    .filter((name) => {
      const entry = join(componentsDir, name)
      return statSync(entry).isDirectory() && /^[A-Z]/.test(name)
    })
    .sort()
}

function buildExports(folders) {
  /** @type {Record<string, { types: string; import: string }>} */
  const exports = {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js'
    }
  }

  for (const folder of folders) {
    if (EXCLUDE.has(folder)) continue
    const key = `./${toKebab(folder)}`
    exports[key] = {
      types: `./dist/${folder}.d.ts`,
      import: `./dist/${folder}.js`
    }
  }

  // Legacy subpath kept for compatibility — SpotIllustration has its own plan.
  exports['./spot-illustrations'] = {
    types: './dist/SpotIllustration.d.ts',
    import: './dist/SpotIllustration.js'
  }

  return exports
}

function main() {
  const folders = listComponentFolders()
  const nextExports = buildExports(folders)

  const raw = readFileSync(packageJsonPath, 'utf8')
  const pkg = JSON.parse(raw)
  pkg.exports = nextExports

  // Preserve 2-space indentation + trailing newline (Prettier default).
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n')

  const entries = Object.keys(nextExports).filter((k) => k !== '.')
  console.log(
    `Regenerated ${entries.length} subpath exports in package.json:\n  ` +
      entries.join('\n  ')
  )
}

main()
