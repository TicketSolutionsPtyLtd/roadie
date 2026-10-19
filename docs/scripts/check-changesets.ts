// Warns, never fails, when a pending changeset is worded so the docs changelog
// misses a highlight card. Checks every pending changeset, or the files given.
// Usage: node docs/scripts/check-changesets.ts [.changeset/name.md ...]
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

import { changesetWarnings } from '../src/lib/changeset-warnings.ts'
import { type PageIndex, kebab } from '../src/lib/releases.ts'

const ROOT = join(import.meta.dirname, '../..')
const APP = join(ROOT, 'docs/src/app')
const CHANGESETS = join(ROOT, '.changeset')

const given = process.argv.slice(2).map((path) => join(process.cwd(), path))
const paths =
  given.length > 0
    ? given.filter((path) => path.endsWith('.md') && existsSync(path))
    : readdirSync(CHANGESETS)
        .filter((file) => file.endsWith('.md') && file !== 'README.md')
        .sort()
        .map((file) => join(CHANGESETS, file))

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
for (const { file, message } of warnings)
  console.log(`::warning file=${file},title=Changelog card::${message}`)
console.log(
  `Checked ${files.length} changeset${files.length === 1 ? '' : 's'}: ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`
)
