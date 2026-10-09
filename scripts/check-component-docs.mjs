#!/usr/bin/env node
// Fails when an exported component has no docs page or no catalogue tile.
// Usage: node scripts/check-component-docs.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import {
  caseSlugs,
  exportedFolders,
  findMissingDocs
} from '../packages/components/scripts/component-docs.mjs'

const root = join(import.meta.dirname, '..')

const ALLOW_LIST = {
  CheckboxGroup: 'Documented on the Checkbox page.',
  Records:
    'The engine behind RecordTable and RecordGrid, documented on foundations/records.'
}

const PAGE_ROUTES = ['docs/src/app/components', 'docs/src/app/charts']
const TILE_FILES = [
  'docs/src/components/ComponentSkeleton.tsx',
  'docs/src/components/ChartPreview.tsx'
]

function exportedComponents() {
  const { exports } = JSON.parse(
    readFileSync(join(root, 'packages/components/package.json'), 'utf8')
  )
  return exportedFolders(exports)
}

function pageSlugs() {
  return PAGE_ROUTES.flatMap((route) =>
    readdirSync(join(root, route), { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          ['page.mdx', 'page.tsx'].some((page) =>
            existsSync(join(root, route, entry.name, page))
          )
      )
      .map((entry) => entry.name)
  )
}

function tileSlugs() {
  return TILE_FILES.flatMap((file) =>
    caseSlugs(readFileSync(join(root, file), 'utf8'))
  )
}

const { missing, staleAllowList } = findMissingDocs({
  components: exportedComponents(),
  pages: pageSlugs(),
  tiles: tileSlugs(),
  allowList: ALLOW_LIST
})

for (const { component, missing: pieces } of missing)
  console.error(`${component} has no ${pieces.join(' and no ')}.`)
for (const component of staleAllowList)
  console.error(
    `${component} is allow-listed but is documented or no longer exported. Remove it from ALLOW_LIST.`
  )

if (missing.length > 0 || staleAllowList.length > 0) {
  console.error(
    '\nAdd a page in docs/src/app/components/<slug>/ (or charts/) and a case in ComponentSkeleton.tsx (or ChartPreview.tsx). See .claude/skills/new-component/SKILL.md.'
  )
  process.exit(1)
}

console.log('Every exported component has a docs page and an index tile.')
