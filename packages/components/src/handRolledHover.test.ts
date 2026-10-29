/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest'

// Each one says why beside the class, except RecordTableRow: its hover tints
// a surface variable its sticky cells share, which no utility sets.
const ALLOWED = new Set([
  'components/DataTable/SortIcon.tsx',
  'components/RecordTable/RecordTableRow.tsx',
  'components/ScrollArea/variants.ts'
])

// A Tailwind hover variant, but not a `(hover:hover)` media gate.
const HOVER_CLASS = /(?:^|[\s'"`])(?:[\w-]+:)*(?:group-|peer-)?hover:[\w[]/

const SOURCES = import.meta.glob<string>(
  ['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true }
)

describe('component hover states', () => {
  it('come from interaction utilities, never hover classes', () => {
    const handRolled = Object.entries(SOURCES).flatMap(([path, source]) => {
      const file = path.slice(2)
      if (ALLOWED.has(file)) return []
      return source
        .split('\n')
        .flatMap((line, index) =>
          HOVER_CLASS.test(line) ? [`${file}:${index + 1}`] : []
        )
    })
    expect(handRolled).toEqual([])
  })

  it('reads every source, and each allowed file still exists', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100)
    for (const file of ALLOWED) expect(SOURCES).toHaveProperty(`./${file}`)
  })

  it('catches a hover class', () => {
    expect(HOVER_CLASS.test("'text-subtle hover:text-normal'")).toBe(true)
    expect(HOVER_CLASS.test("'group-hover:text-subtle'")).toBe(true)
    expect(HOVER_CLASS.test("'data-selected:hover:[--x:1]'")).toBe(true)
    expect(HOVER_CLASS.test("'[@media(hover:hover)]:bg-subtle'")).toBe(false)
  })
})
