#!/usr/bin/env node
// Fails the build if a 'use client' source file emits without the directive.
// The tsdown configs silence rolldown's MODULE_LEVEL_DIRECTIVE warning because
// unbundle mode keeps the directive per file; this proves it still does.
// Run from a package root whose src/ maps 1:1 onto dist/.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const sourceFiles = readdirSync('src', { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => relative('src', join(entry.parentPath, entry.name)))
  .filter((name) => /\.tsx?$/.test(name) && !name.endsWith('.d.ts'))

const offenders = sourceFiles.filter((name) => {
  if (!/^['"]use client['"]/.test(readFileSync(join('src', name), 'utf8')))
    return false
  const output = join('dist', name.replace(/\.tsx?$/, '.js'))
  // Tests and other excluded entries never emit.
  if (!existsSync(output)) return false
  return !readFileSync(output, 'utf8').startsWith('"use client";')
})

if (offenders.length > 0) {
  console.error('ERROR: these dist files lost their "use client" directive:')
  for (const name of offenders)
    console.error(`  src/${name.replaceAll('\\', '/')}`)
  process.exit(1)
}
