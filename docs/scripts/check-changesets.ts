// Warns, never fails, when a pending changeset is worded so the docs changelog
// misses a highlight card. Checks every pending changeset, the files given, or
// those added, edited, or renamed since a base commit.
// Usage: node docs/scripts/check-changesets.ts [--base <ref> | .changeset/name.md ...]
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { changesetWarnings } from '../src/lib/changeset-warnings.ts'
import { type PageIndex, kebab } from '../src/lib/releases.ts'

const ROOT = join(import.meta.dirname, '../..')
const APP = join(ROOT, 'docs/src/app')
const CHANGESETS = join(ROOT, '.changeset')

const args = process.argv.slice(2)
const baseAt = args.indexOf('--base')
const base = baseAt === -1 ? undefined : args[baseAt + 1] || 'origin/main'

// -z keeps a name with spaces whole.
const changedSince = (ref: string) =>
  execFileSync(
    'git',
    [
      'diff',
      '-z',
      '--name-only',
      '--diff-filter=AMR',
      ref,
      'HEAD',
      '--',
      '.changeset/*.md'
    ],
    { cwd: ROOT, encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean)
    .map((file) => join(ROOT, file))

const pending = () =>
  readdirSync(CHANGESETS)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .map((file) => join(CHANGESETS, file))

const paths = (
  base
    ? changedSince(base)
    : args.length > 0
      ? args.map((path) => resolve(path))
      : pending()
).filter((path) => path.endsWith('.md') && existsSync(path))

const files = paths.map((path) => ({
  file: relative(ROOT, path),
  source: readFileSync(path, 'utf8')
}))

// Component pages by name, from the docs app, so the check needs no built manifests.
const index: PageIndex = new Map()
for (const { source } of files)
  for (const [, name = ''] of source.matchAll(/`([A-Z][A-Za-z0-9]*)`/g))
    for (const section of ['components', 'charts']) {
      const route = `/${section}/${kebab(name)}`
      if (
        !index.has(name) &&
        ['page.mdx', 'page.tsx'].some((page) =>
          existsSync(join(APP, route, page))
        )
      )
        index.set(name, { title: name, href: route })
    }

const warnings = changesetWarnings(files, index)
const escapeData = (text: string) =>
  text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
const escapeProperty = (text: string) =>
  escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C')
for (const { file, message } of warnings)
  console.log(
    `::warning file=${escapeProperty(file)},title=Changelog card::${escapeData(message)}`
  )
console.log(
  `Checked ${files.length} changeset${files.length === 1 ? '' : 's'}: ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`
)
