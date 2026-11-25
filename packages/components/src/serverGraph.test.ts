/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest'

type Sources = Record<string, string>

const SOURCES = import.meta.glob<string>(
  ['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true }
)

// A type-only import loads nothing, so it isn't followed.
const VALUE_IMPORT =
  /(?:^|\n)(?:import|export)\s+(?!type\s)(?:[\w$*, ]*(?:\{[^}]*\})?\s*from\s+)?['"](\.[^'"]*)['"]/g

// React's server build has no createContext, so calling it as a module loads throws.
const CREATES_CONTEXT = /\bcreateContext\s*[<(]/

/** What a Server Component loads with `entry`: the modules that create a context, and the client modules where the graph stops. */
function serverGraph(sources: Sources, entry: string) {
  const seen = new Set<string>()
  const stack = [entry]
  const found: string[] = []
  const clients: string[] = []
  while (stack.length > 0) {
    const file = stack.pop()!
    const source = sources[file]
    if (source === undefined || seen.has(file)) continue
    seen.add(file)
    if (/^['"]use client['"]/.test(source)) {
      clients.push(file)
      continue
    }
    if (CREATES_CONTEXT.test(source)) found.push(file)
    for (const match of source.matchAll(VALUE_IMPORT)) {
      const { pathname } = new URL(match[1]!, `file:///${file}`)
      // '.' and '..' name a folder, whose path ends in a slash.
      const path = `.${pathname.replace(/\/$/, '')}`
      stack.push(
        `${path}.ts`,
        `${path}.tsx`,
        `${path}/index.ts`,
        `${path}/index.tsx`
      )
    }
  }
  return { contexts: found, clients: clients.sort() }
}

const contextsOnServer = (sources: Sources, entry: string) =>
  serverGraph(sources, entry).contexts

describe('a Server Component importing an entry', () => {
  it('loads no module that creates a context', () => {
    const entries = Object.keys(SOURCES).filter((file) =>
      /\/index\.tsx?$/.test(file)
    )
    expect(entries.length).toBeGreaterThan(50)
    expect(
      entries.flatMap((entry) =>
        contextsOnServer(SOURCES, entry).map((file) => `${entry}: ${file}`)
      )
    ).toEqual([])
  })

  const found = (index: string, rows: string) =>
    contextsOnServer(
      {
        './index.ts': index,
        './rows.ts': rows,
        './Row.tsx': 'export const Place = createContext<number>(0)'
      },
      './index.ts'
    )
  const rows = "import {\n  Row\n} from './Row'"

  it('finds a context two imports from the entry', () => {
    expect(found("export { Rows } from './rows'", rows)).toEqual(['./Row.tsx'])
  })

  it('stops at a client module', () => {
    expect(
      found("export { Rows } from './rows'", `'use client'\n\n${rows}`)
    ).toEqual([])
  })

  it.each([
    "import './rows'",
    "export * from './rows'",
    "import Rows, { type Row } from './rows'",
    'import { Rows } from "./rows"'
  ])('follows %s', (index) => {
    expect(found(index, rows)).toEqual(['./Row.tsx'])
  })

  it('follows an import of a folder to its index', () => {
    expect(
      contextsOnServer(
        {
          './index.ts': "export { Row } from './row/Row'",
          './row/Row.tsx': "import { Place } from '.'",
          './row/index.ts': "export { Place } from '../place'",
          './place/index.tsx': 'export const Place = createContext<number>(0)'
        },
        './index.ts'
      )
    ).toEqual(['./place/index.tsx'])
  })

  it.each([
    "export type { Rows } from './rows'",
    "import type { Rows } from './rows'",
    "export { Rows }\nexport type { Row } from './rows'"
  ])('follows no type-only import, as in %j', (index) => {
    expect(found(index, rows)).toEqual([])
  })

  // Each client module here ships to the browser with the entry. Only the
  // parts that need state, context or events are client modules (INNO-1693).
  it.each([
    [
      'Callout',
      [
        'Button/IconButton.tsx',
        'Callout/CalloutIcon.tsx',
        'Callout/CalloutIntent.tsx'
      ]
    ]
  ])(
    'keeps %s server-rendered up to its interactive parts',
    (name, clients) => {
      expect(
        serverGraph(SOURCES, `./components/${name}/index.tsx`).clients
      ).toEqual(clients.map((file) => `./components/${file}`))
    }
  )
})
