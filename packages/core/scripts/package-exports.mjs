// The one reader of a package.json `exports` block. Plain JavaScript with no
// TypeScript import, so build configs, tests and scripts in every package can
// share it; types are in package-exports.d.mts.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const SOURCE_EXTENSIONS = ['.tsx', '.ts']

// What an app's bundler resolves: `import`, then `default`, then `style`.
function targetOf(value) {
  if (typeof value === 'string') return value
  return targetOf(
    value.import ?? value.default ?? value.style ?? Object.values(value)[0]
  )
}

function filesOf(value) {
  if (typeof value === 'string') return [value]
  return Object.values(value).flatMap(filesOf)
}

function kindOf(target) {
  if (target.endsWith('.js')) return 'js'
  if (target.endsWith('.css')) return 'css'
  if (target.endsWith('.json')) return 'json'
  return 'asset'
}

function sourceFor(target, packageDir) {
  const stem = target.replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '')
  return SOURCE_EXTENSIONS.map((extension) =>
    path.join(packageDir, stem + extension)
  ).find((candidate) => existsSync(candidate))
}

export function exportEntries(exports, packageDir) {
  const subpaths = typeof exports === 'string' ? { '.': exports } : exports
  return Object.entries(subpaths ?? {}).map(([subpath, value]) => {
    const target = targetOf(value)
    const kind = kindOf(target)
    const entry = { subpath, target, kind, files: filesOf(value) }
    const source =
      kind === 'js' && packageDir ? sourceFor(target, packageDir) : undefined
    return source ? { ...entry, source } : entry
  })
}

export function readExports(packageDir) {
  const { exports } = JSON.parse(
    readFileSync(path.join(packageDir, 'package.json'), 'utf8')
  )
  return exportEntries(exports, packageDir)
}
