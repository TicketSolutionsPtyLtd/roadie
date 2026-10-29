#!/usr/bin/env node
// Fails the build if Node's ESM loader can't import a built subpath. Vitest
// in a consumer loads Roadie this way unless it inlines it, and Node rejects
// imports bundlers accept, such as a dependency's folder subpath with no
// `exports` map.
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)

const specifiers = Object.entries(pkg.exports)
  .filter(([, target]) => typeof target === 'object' && target.import)
  .map(([subpath]) => pkg.name + subpath.slice(1))

const failures = []
for (const specifier of specifiers) {
  try {
    await import(specifier)
  } catch (error) {
    failures.push(`  ${specifier}\n    ${error.message.split('\n')[0]}`)
  }
}

if (failures.length > 0) {
  console.error(`ERROR: Node can't import these built subpaths:`)
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`Node imported all ${specifiers.length} subpaths.`)
