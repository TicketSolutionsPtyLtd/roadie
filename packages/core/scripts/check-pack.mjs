#!/usr/bin/env node
// Fails if the tarball `pnpm pack` would publish ships a test, a fixture, or a
// source map whose sources it neither ships nor embeds, or leaves out a file
// its `exports` point at. Run from a package root.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const TEST_FILE =
  /(^|\/)(__tests__|__screenshots__|__snapshots__|__fixtures__|fixtures)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)(testUtils|\w+TestUtils)\.[cm]?[jt]sx?$/

function exportTargets(exports) {
  if (typeof exports === 'string') return [exports]
  return Object.values(exports ?? {}).flatMap(exportTargets)
}

function shipsTarget(target, files, shipped) {
  const file = target.replace(/^\.\//, '')
  if (!file.includes('*')) return shipped.has(file)
  const [before, after] = file.split('*')
  return files.some(
    (candidate) => candidate.startsWith(before) && candidate.endsWith(after)
  )
}

// `withheld` is what package.json `files` leaves out by name, such as an export
// only this repo uses.
export function packProblems(files, readFile, exports, withheld = []) {
  const shipped = new Set(files)
  const problems = exportTargets(exports)
    .filter((target) => !withheld.includes(target.replace(/^\.\//, '')))
    .filter((target) => !shipsTarget(target, files, shipped))
    .map(
      (target) => `exports points at ${target}, which the tarball doesn't ship`
    )
  for (const file of files) {
    if (TEST_FILE.test(file)) problems.push(`${file} is a test file`)
    if (!file.endsWith('.map')) continue
    const map = JSON.parse(readFile(file))
    const missing = map.sources.filter(
      (source, index) =>
        map.sourcesContent?.[index] == null &&
        !shipped.has(path.posix.join(path.posix.dirname(file), source))
    )
    if (missing.length > 0)
      problems.push(
        `${file} points at ${missing.join(', ')}, which the tarball doesn't ship`
      )
  }
  return problems
}

function packedFiles() {
  const output = execFileSync('pnpm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  })
  return JSON.parse(output).files.map((file) => file.path)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = packedFiles()
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const problems = packProblems(
    files,
    (file) => readFileSync(file, 'utf8'),
    pkg.exports,
    pkg.files
      .filter((entry) => entry.startsWith('!'))
      .map((entry) => entry.slice(1))
  )
  if (problems.length > 0) {
    console.error(`ERROR: the tarball ships files it shouldn't:`)
    for (const problem of problems) console.error(`  ${problem}`)
    console.error(`Exclude them in package.json "files".`)
    process.exit(1)
  }
  console.log(
    `The tarball's ${files.length} files have no tests or broken maps, and include every export.`
  )
}
