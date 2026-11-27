#!/usr/bin/env node
// Fails the build if a Server Component can't import a built subpath. Run
// from a package root with `node --conditions=react-server`, so `react` is its
// server build, which has no createContext or hooks. A client module is
// stubbed as the reference a server bundler would put in its place, so what
// loads is what a Server Component runs: a module on the server graph that
// imports a hook or createContext by name, or calls one as it loads, throws here.
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { readExports } from './package-exports.mjs'

const root = pathToFileURL(`${process.cwd()}/`)
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))

if (!process.execArgv.join(' ').includes('react-server')) {
  console.error('ERROR: run with node --conditions=react-server.')
  process.exit(1)
}

/** The names a built module exports, from its `export { a, b as c }` lists and declarations. */
function exportedNames(source) {
  const names = new Set()
  for (const [, list] of source.matchAll(/\bexport\s*\{([^}]*)\}/g))
    for (const part of list.split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .at(-1)
      if (name) names.add(name)
    }
  for (const [, name] of source.matchAll(
    /\bexport\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([\w$]+)/g
  ))
    names.add(name)
  if (/\bexport\s+default\b/.test(source)) names.add('default')
  return [...names]
}

const referenceModule = (names) =>
  [
    "const reference = (name) => Object.defineProperties(() => { throw new Error(`${name} is a client reference`) }, { $$typeof: { value: Symbol.for('react.client.reference') } })",
    ...names.map((name) =>
      name === 'default'
        ? "export default reference('default')"
        : `export const ${name} = reference('${name}')`
    )
  ].join('\n')

// The directive, after any comments: dependencies don't all minify it to the top.
const CLIENT = /^(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*['"]use client['"]/

registerHooks({
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context)
    // Any package's client module, as a server bundler treats each one.
    if (!url.startsWith('file:') || !/\.m?js$/.test(url)) return loaded
    const source = String(loaded.source)
    if (!CLIENT.test(source)) return loaded
    return { ...loaded, source: referenceModule(exportedNames(source)) }
  }
})

// By file: this script lives in core, which doesn't depend on the package it checks.
const entries = readExports(fileURLToPath(root))
  .filter((entry) => entry.kind === 'js')
  .map(({ subpath, target }) => [pkg.name + subpath.slice(1), target])

const failures = []
for (const [specifier, file] of entries) {
  try {
    await import(new URL(file, root).href)
  } catch (error) {
    failures.push(`  ${specifier}\n    ${error.message.split('\n')[0]}`)
  }
}

if (failures.length > 0) {
  console.error("ERROR: a Server Component can't import these subpaths:")
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`A Server Component imported all ${entries.length} subpaths.`)
