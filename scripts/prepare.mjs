// Builds on install only when a package has no dist, as on a fresh clone, so
// editors and direct `vitest` runs resolve workspace imports. Turbo tasks
// rebuild stale packages through `^build`, and CI jobs build only what their
// tasks need.
//
// attw's `pnpm pack` re-enters `pnpm install` → `prepare` → build → pack …
// until CI is killed. pnpm scrubs lifecycle env, so a filesystem lock, not an
// env var, stops the nested prepare.
import { execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lock = join(root, 'node_modules', '.cache', 'roadie-prepare.lock')
const STALE_MS = 30 * 60 * 1000

function packagesMissingDist() {
  const packages = join(root, 'packages')
  return readdirSync(packages).filter((name) => {
    const manifest = join(packages, name, 'package.json')
    if (!existsSync(manifest)) return false
    const { scripts = {} } = JSON.parse(readFileSync(manifest, 'utf8'))
    return scripts.build && !existsSync(join(packages, name, 'dist'))
  })
}

function takeLock() {
  mkdirSync(dirname(lock), { recursive: true })
  writeFileSync(lock, String(Date.now()))
}

// The lock outlives this exit, so a nested prepare from attw's pack can't
// build even if pnpm strips CI from its environment.
if (process.env.CI) {
  takeLock()
  process.exit(0)
}

try {
  const age = Date.now() - Number(readFileSync(lock, 'utf8'))
  if (age >= 0 && age < STALE_MS) process.exit(0)
} catch {
  // No lock, or unreadable: run.
}

const missing = packagesMissingDist()
if (missing.length === 0) process.exit(0)

console.log(`Building packages with no dist yet: ${missing.join(', ')}`)
takeLock()
try {
  execSync('turbo run build --filter="./packages/*"', {
    cwd: root,
    stdio: 'inherit'
  })
} finally {
  rmSync(lock, { force: true })
}
