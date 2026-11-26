#!/usr/bin/env node
// Fails if a built .d.ts leaks `ComponentProps<typeof ...>`: inferred prop
// types don't survive bundler boundaries, so components export named prop
// types. A Node scan, since a shell one-liner broke under cmd.exe on Windows.
// Run from a package root, after a build.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const NEEDLE = 'ComponentProps<typeof'

export function dtsLeaks(distDir) {
  let files
  try {
    files = readdirSync(distDir, { recursive: true }).map(String)
  } catch {
    return []
  }
  return files
    .filter((file) => file.endsWith('.d.ts'))
    .filter((file) =>
      readFileSync(join(distDir, file), 'utf8').includes(NEEDLE)
    )
    .map((file) => file.replaceAll('\\', '/'))
}

if (import.meta.main) {
  const leaks = dtsLeaks(join(process.cwd(), 'dist'))
  if (leaks.length > 0) {
    console.error(
      `ERROR: dist .d.ts files contain ${NEEDLE} — use named prop types instead:`
    )
    for (const file of leaks) console.error(`  dist/${file}`)
    process.exit(1)
  }
}
