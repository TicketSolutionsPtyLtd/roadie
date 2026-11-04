// Tests and their helpers are left out of the package build hash, so editing
// one doesn't rebuild the package, every package that depends on it, and the
// docs. That only holds while no shipped file imports a helper.
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const TEST_ONLY =
  /\.test\.|__screenshots__\/|__snapshots__\/|(?:^|\/)(?:testUtils|\w+TestUtils|fixtures|testChart|browserTesting)\.\w+$|\/_test\//
const IMPORT = /(?:from|import)\s*\(?\s*['"]((?:\.{1,2}|@)\/[^'"]+)['"]/g

// The docs build hashes its source with the same exclusions.
const builds = JSON.parse(
  execSync(
    'pnpm exec turbo run build --filter="./packages/*" --filter=docs --dry=json',
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit']
    }
  )
).tasks.filter((task) => task.command !== '<NONEXISTENT>')

// Docs maps @/ to its src folder.
function resolveImport(dir, from, specifier) {
  const base = specifier.startsWith('@/')
    ? join(dir, 'src', specifier.slice(2))
    : join(dirname(from), specifier)
  const stem = base.replace(/\.js$/, '')
  return [
    base,
    `${stem}.ts`,
    `${stem}.tsx`,
    join(stem, 'index.ts'),
    join(stem, 'index.tsx')
  ].find((file) => existsSync(file))
}

describe('build inputs', () => {
  it('leave out tests and test helpers', () => {
    const tested = builds.flatMap((task) =>
      Object.keys(task.inputs)
        .filter((file) => TEST_ONLY.test(file))
        .map((file) => `${task.taskId}: ${file}`)
    )
    assert.deepEqual(tested, [])
  })

  it('cover every file the source they hash imports', () => {
    const unhashed = builds.flatMap((task) => {
      const dir = join(root, task.directory)
      const inputs = new Set(Object.keys(task.inputs))
      return [...inputs]
        .filter((file) => /\.(ts|tsx|mts|js|mjs)$/.test(file))
        .flatMap((file) => {
          const path = join(dir, file)
          const source = readFileSync(path, 'utf8')
          return [...source.matchAll(IMPORT)]
            .map(([, specifier]) => resolveImport(dir, path, specifier))
            .filter((target) => target?.startsWith(join(dir, 'src')))
            .map((target) => relative(dir, target))
            .filter((target) => TEST_ONLY.test(target) && !inputs.has(target))
            .map((target) => `${task.taskId}: ${file} imports ${target}`)
        })
    })
    assert.deepEqual(unhashed, [])
  })
})

// roadie/canonical-class loads core's stylesheet from source, and lint has no
// ^build to bring that source into its hash.
describe('docs lint inputs', () => {
  it('cover the stylesheet canonical-class loads', () => {
    const lints = JSON.parse(
      execSync('pnpm exec turbo run lint lint:fix --filter=docs --dry=json', {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit']
      })
    ).tasks
    const sheets = readdirSync(join(root, 'packages/core/src/css')).filter(
      (file) => file.endsWith('.css')
    )
    const unhashed = lints.flatMap((task) =>
      sheets
        .map((sheet) => `../packages/core/src/css/${sheet}`)
        .filter((sheet) => !(sheet in task.inputs))
        .map((sheet) => `${task.taskId}: ${sheet}`)
    )
    assert.equal(lints.length, 2)
    assert.deepEqual(unhashed, [])
  })
})
