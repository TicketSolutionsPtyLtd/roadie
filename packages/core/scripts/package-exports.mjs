// The one reader of a package.json `exports` block. Plain JavaScript with no
// TypeScript import, so build configs, tests and scripts in every package can
// share it; types are in package-exports.d.mts.
import { existsSync, globSync, readFileSync } from 'node:fs'
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

// Tests, their helpers and fixtures, and a component's `.ssr.tsx` hydration
// fixture. paneColumns is the model browser tests measure the stylesheet
// against, and renderCounter stands in for React's DevTools hook in perf tests.
const TEST_FOLDER =
  /(^|\/)(__tests__|__mocks__|__screenshots__|__snapshots__|__fixtures__|fixtures?|_?tests?)\//
const TEST_FILE =
  /\.(test|spec|ssr)(-d)?\.(d\.)?[cm]?[jt]sx?$|(^|\/)(fixtures|testChart|browserTesting|paneColumns|renderCounter)\.[^/]*$/
const TEST_HELPER = /((^|[/._-])[Tt]est[-_]?[Uu]tils|\wTestUtils)\b/

export function isShipped(file) {
  return ![TEST_FOLDER, TEST_FILE, TEST_HELPER].some((test) => test.test(file))
}

// A glob less each file isShipped leaves out, not a file list, so `tsdown
// --watch` reads its entries again when a file is added or deleted. A test
// added while it runs stays out by its suffix until the next start.
export function shippedSources(packageDir = '.') {
  const sources = 'src/**/*.{ts,tsx}'
  const unshipped = globSync(sources, { cwd: packageDir })
    .filter((file) => !isShipped(file))
    .map((file) => `!${file}`)
  return [sources, '!**/*.test.{ts,tsx}', ...unshipped]
}

export function exportEntries(exports, packageDir) {
  const subpaths = typeof exports === 'string' ? { '.': exports } : exports
  const visible = Object.entries(subpaths ?? {}).filter(([, v]) => v !== null)
  return visible.map(([subpath, value]) => {
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
