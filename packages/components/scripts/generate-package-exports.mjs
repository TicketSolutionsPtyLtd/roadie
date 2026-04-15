#!/usr/bin/env node
// Regenerates the `exports` block in packages/components/package.json from
// the components folder. Run this after adding or removing a component.
//
// Source of truth: packages/components/src/components/*
// Targets:         packages/components/package.json → "exports"
//
// The tsdown build runs in unbundle mode, so each compound folder emits
// its own directory under `dist/components/<Compound>/` with one file per
// source file plus an `index.js` that re-exports the namespace. Subpath
// keys are kebab-case (matching Base UI's consumer surface) and point at
// the compound's `index.js` + `index.d.ts`.
//
// Why unbundle: every leaf must be its own on-disk client module for
// Next.js server components to dot into the compound namespace without
// hitting the client-reference-proxy wall. See:
//   docs/solutions/rsc-patterns/compound-export-namespace.md
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, '..')
const componentsDir = join(packageRoot, 'src/components')
const packageJsonPath = join(packageRoot, 'package.json')

// Components intentionally excluded from the auto-generated subpath block:
// - Indicator: internal after Phase 10 M8; consumed via Field / Select / RadioGroup.
// - SpotIllustration: tracked in a separate plan; retains its own legacy
//   `./spot-illustrations` subpath key, handled manually below.
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
      types: `./dist/components/${folder}/index.d.ts`,
      import: `./dist/components/${folder}/index.js`
    }
  }

  // Legacy subpath kept for compatibility — SpotIllustration has its own plan.
  exports['./spot-illustrations'] = {
    types: './dist/components/SpotIllustration/index.d.ts',
    import: './dist/components/SpotIllustration/index.js'
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
