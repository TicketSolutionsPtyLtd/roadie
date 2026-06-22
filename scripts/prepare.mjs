// `prepare` fires on `pnpm install` AND from inside the build: attw's
// `check:exports` runs `pnpm pack`, whose supply-chain verify re-enters
// `pnpm install` → `prepare` → `turbo run prepare` → `^build` → pack → …
// looping until CI is SIGTERM-killed (exit 143). pnpm runs lifecycle scripts
// with a scrubbed env, so an env-var guard doesn't survive the hop — a
// filesystem sentinel does. The nested prepare finds the lock and no-ops; the
// build it would have kicked off is already running.
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const lock = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'node_modules',
  '.cache',
  'roadie-prepare.lock'
)
const STALE_MS = 30 * 60 * 1000

try {
  const age = Date.now() - Number(readFileSync(lock, 'utf8'))
  if (age >= 0 && age < STALE_MS) process.exit(0)
} catch {
  // no lock (or unreadable) → fall through and run
}

mkdirSync(dirname(lock), { recursive: true })
writeFileSync(lock, String(Date.now()))
try {
  execSync('turbo run prepare', { stdio: 'inherit' })
} finally {
  rmSync(lock, { force: true })
}
