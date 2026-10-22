import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

// In oxlint, the last matching override replaces no-restricted-imports'
// options, and excludeFiles isn't documented, so a config edit can drop a
// boundary or an exception without an error.
const root = fileURLToPath(new URL('..', import.meta.url))

// Each group import is deep, since a group's `*` stops at a slash.
const IMPORTS = `import Link from 'next/link'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { observeElementRect } from '@tanstack/virtual-core/utils'
import { z } from 'zod'
import { schema } from './schema'
import router from 'next/dist/client/router'
export const seed = [Link, draggable, observeElementRect, z, schema, router]
`
const TYPE_IMPORT = `import type { Schema } from './schema'
export type { Schema }
`
const ENV = `export const dev = import.meta.env.DEV
`
const JSDOM = `import css from './button.css?raw'
declare const el: HTMLElement
export const raw = css
expect(el).toHaveClass('max-lg:hidden')
Object.defineProperty(el, 'offsetWidth', { value: 200 })
`

// Each boundary is named by the start of its message in oxlint.config.ts.
const BOUNDARIES = {
  nextLink: 'Pass href and let RoadieProvider route it.',
  atlaskit: 'Import the drag library only in Sortable/dnd.',
  tanstack: 'Import @tanstack/react-virtual only in Records/rowWindow.ts.',
  chartsTanstack: 'Import TanStack only in plot/, static/,',
  skinNext: 'The React skin routes through onNavigate, not next/*.',
  zod: 'Keep this module zod-free.',
  schema: 'Import only types from ./schema here.'
}

function labelOf({ code, help }) {
  const rule = code.replace(/^\w+\((.*)\)$/, '$1')
  if (rule !== 'no-restricted-imports') return rule
  return (
    Object.keys(BOUNDARIES).find((name) =>
      help?.startsWith(BOUNDARIES[name])
    ) ?? help
  )
}

// Lints each seed with the root config from a scratch folder, so nothing is
// written into the repo. Returns each path's sorted, distinct labels.
function lintSeeds(seeds) {
  const scratch = mkdtempSync(join(tmpdir(), 'roadie-oxlint-'))
  try {
    writeFileSync(
      join(scratch, 'oxlint.config.ts'),
      `export { default } from '${join(root, 'oxlint.config.ts')}'\n`
    )
    // The config names its JS plugin by a path relative to itself.
    symlinkSync(join(root, 'eslint'), join(scratch, 'eslint'))
    for (const [path, source] of seeds) {
      mkdirSync(dirname(join(scratch, path)), { recursive: true })
      writeFileSync(join(scratch, path), source)
    }
    const { stdout, stderr } = spawnSync(
      join(root, 'node_modules/.bin/oxlint'),
      ['-f', 'json', ...seeds.map(([path]) => path)],
      { cwd: scratch, encoding: 'utf8' }
    )
    if (!stdout) throw new Error(stderr)
    const labels = new Map(seeds.map(([path]) => [path, new Set()]))
    for (const diagnostic of JSON.parse(stdout).diagnostics) {
      labels.get(diagnostic.filename).add(labelOf(diagnostic))
    }
    return new Map(
      [...labels].map(([path, found]) => [path, [...found].sort()])
    )
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

const components = 'packages/components/src/components'
const charts = 'packages/charts/src'
const dashboard = 'packages/core/src/dashboard'

describe('oxlint import boundaries', () => {
  const cases = [
    ['packages/editor/src/seed.ts', ['nextLink']],
    [`${components}/Seed/index.tsx`, ['atlaskit', 'nextLink', 'tanstack']],
    [`${components}/Sortable/seed.tsx`, ['atlaskit', 'nextLink', 'tanstack']],
    [`${components}/Sortable/dnd/seed.ts`, ['nextLink', 'tanstack']],
    [`${components}/Sortable/dnd/deep/seed.tsx`, ['nextLink', 'tanstack']],
    [`${components}/Records/seed.ts`, ['atlaskit', 'nextLink', 'tanstack']],
    [`${components}/Records/rowWindow.ts`, ['atlaskit', 'nextLink']],
    [`${charts}/seed.ts`, ['chartsTanstack', 'nextLink']],
    [`${charts}/SeedChart/index.tsx`, ['chartsTanstack', 'nextLink']],
    [`${charts}/plot/seed.ts`, ['nextLink']],
    [`${charts}/static/seed.ts`, ['nextLink']],
    [`${charts}/SeedChart/definition.ts`, ['nextLink']],
    [`${charts}/SeedChart/definition.test.ts`, ['nextLink']],
    [`${charts}/SeedChart/definition.test.tsx`, ['nextLink']],
    [
      'packages/widgets/src/cart-drawer/react/seed.tsx',
      ['nextLink', 'skinNext']
    ],
    ['packages/widgets/src/cart-drawer/vue/seed.ts', ['nextLink']],
    [`${dashboard}/seed.ts`, ['nextLink']],
    [`${dashboard}/totals.ts`, ['nextLink', 'schema', 'zod']],
    [`${dashboard}/cells.ts`, ['nextLink', 'schema', 'zod']],
    [`${dashboard}/layout.ts`, ['nextLink', 'schema', 'zod']]
  ]
  let found
  beforeAll(() => {
    found = lintSeeds(cases.map(([path]) => [path, IMPORTS]))
  })

  it.each(cases)('%s reports %j', (path, expected) => {
    expect(found.get(path)).toEqual(expected)
  })

  it.each(['totals', 'cells', 'layout'])(
    'lets %s.ts import types from ./schema',
    (name) => {
      const path = `${dashboard}/${name}.ts`
      expect(lintSeeds([[path, TYPE_IMPORT]]).get(path)).toEqual([])
    }
  )

  // next/link alone also matches a shallow next/* group.
  it.each(['next', 'next/dist/client/router'])(
    'catches %s in the React skin',
    (specifier) => {
      const path = 'packages/widgets/src/cart-drawer/react/seed.tsx'
      const source = `import seed from '${specifier}'
export { seed }
`
      expect(lintSeeds([[path, source]]).get(path)).toEqual(['skinNext'])
    }
  )
})

const JSDOM_RULES = [
  'no-css-class-in-jsdom',
  'no-css-source-in-jsdom',
  'no-layout-fake-in-jsdom'
]

describe('oxlint excludeFiles exceptions', () => {
  const cases = [
    ['packages/core/src/seed.ts', ENV, ['no-import-meta-env']],
    ['packages/core/src/seed.test.ts', ENV, []],
    ['packages/core/src/seed.test.tsx', ENV, []],
    ['packages/charts/src/seed.test.tsx', JSDOM, JSDOM_RULES],
    ['packages/charts/src/seed.browser.test.tsx', JSDOM, []],
    ['packages/charts/src/seed.browser.test.ts', JSDOM, []],
    [
      'packages/widgets/src/cart-drawer/vue/useCartDrawerDrag.test.ts',
      JSDOM,
      ['no-css-class-in-jsdom', 'no-css-source-in-jsdom']
    ],
    ...[
      'packages/core/src/utils/cn.test.ts',
      'packages/core/src/dataviz/parity.test.ts',
      'packages/core/src/theme/parity.test.ts',
      'packages/core/src/dataviz/skill-parity.test.ts',
      'packages/core/src/css/motion-skill-parity.test.ts',
      'packages/core/src/tokens/manifest.test.ts',
      'packages/core/src/css/navigator-variant.test.ts',
      'packages/charts/src/css/safelist.test.ts'
    ].map((path) => [
      path,
      JSDOM,
      ['no-css-class-in-jsdom', 'no-layout-fake-in-jsdom']
    ])
  ]
  let found
  beforeAll(() => {
    found = lintSeeds(cases.map(([path, source]) => [path, source]))
  })

  it.each(cases)('%s reports %j', (path, _source, expected) => {
    expect(found.get(path)).toEqual(expected)
  })
})
