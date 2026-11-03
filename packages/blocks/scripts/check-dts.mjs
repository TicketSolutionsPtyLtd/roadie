#!/usr/bin/env node
// Fails if a .d.ts leaks ComponentProps<typeof ...> — it can't survive bundler boundaries.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const needle = 'ComponentProps<typeof'

let entries
try {
  entries = readdirSync(distDir, { recursive: true })
} catch {
  // No dist yet — nothing to check.
  process.exit(0)
}

const offenders = entries
  .filter((name) => String(name).endsWith('.d.ts'))
  .filter((name) =>
    readFileSync(join(distDir, String(name)), 'utf8').includes(needle)
  )

if (offenders.length > 0) {
  console.error(
    `ERROR: dist .d.ts files contain ${needle} — use named prop types instead:`
  )
  for (const name of offenders)
    console.error(`  dist/${String(name).replaceAll('\\', '/')}`)
  process.exit(1)
}
