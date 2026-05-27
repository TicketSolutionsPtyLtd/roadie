#!/usr/bin/env node
// Fails the build if any emitted .d.ts leaks `ComponentProps<typeof ...>`.
// Those inferred prop types don't survive bundler boundaries — components
// must export named prop types instead.
//
// Replaces a `grep`/`||`/`2>/dev/null` shell one-liner that broke when turbo
// ran it through cmd.exe on Windows. A Node scan is shell-agnostic.
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
