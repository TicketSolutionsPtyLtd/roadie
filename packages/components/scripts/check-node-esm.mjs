#!/usr/bin/env node
// Fails the build if Node's ESM loader can't import a built subpath. Vitest
// in a consumer loads Roadie this way unless it inlines it, and Node rejects
// imports bundlers accept, such as a dependency's folder subpath with no
// `exports` map.
import { readFileSync } from 'node:fs'
import { isBuiltin, registerHooks } from 'node:module'

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)
const distUrl = new URL('../dist/', import.meta.url).href

// Here Node also finds devDependencies, which a consumer doesn't install, so
// a bare import from dist must name a dependency or peer.
const installed = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {})
])
const packageName = (specifier) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/')

const failures = []
registerHooks({
  resolve(specifier, context, nextResolve) {
    const fromDist = context.parentURL?.startsWith(distUrl)
    const bare = !/^[./]|^[a-z]+:/.test(specifier) && !isBuiltin(specifier)
    if (fromDist && bare && !installed.has(packageName(specifier)))
      failures.push(
        `  ${context.parentURL.slice(distUrl.length)}\n    imports ${specifier}, which isn't a dependency`
      )
    return nextResolve(specifier, context)
  }
})

const specifiers = Object.entries(pkg.exports)
  .filter(([, target]) => typeof target === 'object' && target.import)
  .map(([subpath]) => pkg.name + subpath.slice(1))

for (const specifier of specifiers) {
  try {
    await import(specifier)
  } catch (error) {
    failures.push(`  ${specifier}\n    ${error.message.split('\n')[0]}`)
  }
}

if (failures.length > 0) {
  console.error(`ERROR: Node in a consumer can't import the build:`)
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`Node imported all ${specifiers.length} subpaths.`)
