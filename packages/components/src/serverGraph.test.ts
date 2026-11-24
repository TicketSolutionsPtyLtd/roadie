/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest'

type Sources = Record<string, string>

const SOURCES = import.meta.glob<string>(
  ['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true }
)

// A type-only import loads nothing, so it isn't followed.
const VALUE_IMPORT =
  /(?:^|\n)(?:import|export)\s+(?!type\s)[^'"]*?from\s+'(\.[^']+)'/g

// React's server build has no createContext, so calling it as a module loads throws.
const CREATES_CONTEXT = /\bcreateContext\s*[<(]/

/** The modules a Server Component loads with `entry` that create a context: the graph stops at each client module. */
function contextsOnServer(sources: Sources, entry: string) {
  const seen = new Set<string>()
  const stack = [entry]
  const found: string[] = []
  while (stack.length > 0) {
    const file = stack.pop()!
    const source = sources[file]
    if (source === undefined || seen.has(file)) continue
    seen.add(file)
    if (/^['"]use client['"]/.test(source)) continue
    if (CREATES_CONTEXT.test(source)) found.push(file)
    for (const match of source.matchAll(VALUE_IMPORT)) {
      const path = `.${new URL(match[1]!, `file:///${file}`).pathname}`
      stack.push(
        `${path}.ts`,
        `${path}.tsx`,
        `${path}/index.ts`,
        `${path}/index.tsx`
      )
    }
  }
  return found
}

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

  it('follows no type-only import', () => {
    expect(found("export type { Rows } from './rows'", rows)).toEqual([])
  })
})
