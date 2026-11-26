#!/usr/bin/env node
// Fails if the tarball `pnpm pack` would publish ships a test, a test helper, a
// fixture, a test library, or a source map whose sources it neither ships nor
// embeds, or leaves out a file its `exports` point at. Run from a package root.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { readExports } from './package-exports.mjs'

const TEST_FOLDER =
  /(^|\/)(__tests__|__mocks__|__screenshots__|__snapshots__|__fixtures__|fixtures?|_?tests?)\//
// The named helpers are the ones scripts/turbo-inputs.test.mjs lists.
const TEST_FILE =
  /\.(test|spec)(-d)?\.(d\.)?[cm]?[jt]sx?$|(^|\/)(fixtures|testChart|browserTesting)\.[^/]*$/
const TEST_HELPER = /((^|[/._-])[Tt]est[-_]?[Uu]tils|\wTestUtils)\b/
const TEST_LIBRARY =
  /(?:^|\/)node_modules\/((?:@testing-library|@vitest)\/[^/]+|aria-query|axe-core|vitest)\//
const testLibrary = (file) => TEST_LIBRARY.exec(file)?.[1]

function shipsTarget(target, files, shipped) {
  const file = target.replace(/^\.\//, '')
  if (!file.includes('*')) return shipped.has(file)
  const [before, after] = file.split('*')
  return files.some(
    (candidate) => candidate.startsWith(before) && candidate.endsWith(after)
  )
}

// `entries` come from readExports. `withheld` is what package.json `files`
// leaves out by name, such as an export only this repo uses.
export function packProblems(files, readFile, entries = [], withheld = []) {
  const shipped = new Set(files)
  const problems = entries
    .flatMap((entry) => entry.files)
    .filter((target) => !withheld.includes(target.replace(/^\.\//, '')))
    .filter((target) => !shipsTarget(target, files, shipped))
    .map(
      (target) => `exports points at ${target}, which the tarball doesn't ship`
    )
  const fromLibrary = new Map()
  for (const file of files) {
    if (
      TEST_FOLDER.test(file) ||
      TEST_FILE.test(file) ||
      TEST_HELPER.test(file)
    )
      problems.push(`${file} is a test file`)
    const library = testLibrary(file)
    if (library)
      fromLibrary.set(library, [...(fromLibrary.get(library) ?? []), file])
    if (library || !file.endsWith('.map')) continue
    const map = JSON.parse(readFile(file))
    const bundled = new Set(map.sources.map(testLibrary).filter(Boolean))
    if (bundled.size > 0)
      problems.push(
        `${file} bundles test libraries: ${[...bundled].join(', ')}`
      )
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
  for (const [library, [first, ...rest]] of fromLibrary) {
    const which =
      rest.length > 0 ? `${first} and ${rest.length} more are` : `${first} is`
    problems.push(`${which} from ${library}, a test library`)
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
    readExports('.'),
    pkg.files
      .filter((entry) => entry.startsWith('!'))
      .map((entry) => entry.slice(1))
  )
  if (problems.length > 0) {
    console.error(`ERROR: the tarball ships files it shouldn't:`)
    for (const problem of problems) console.error(`  ${problem}`)
    console.error(
      `Exclude them in package.json "files", or in the build's entry if the build wrote them.`
    )
    process.exit(1)
  }
  console.log(
    `The tarball's ${files.length} files have no tests, test libraries, or broken maps, and include every export.`
  )
}
