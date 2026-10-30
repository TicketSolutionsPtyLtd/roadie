/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest'

// Each file's lines with a hover class, each with its why beside it, except
// RecordTableRow: its hover tints a surface variable its sticky cells share,
// which no utility sets.
const ALLOWED = new Map([
  ['components/Card/CardImage.tsx', 1],
  ['components/Carousel/CarouselTitleLink.tsx', 1],
  ['components/DataTable/SortIcon.tsx', 1],
  ['components/RecordTable/RecordTableRow.tsx', 2],
  ['components/ScrollArea/variants.ts', 1],
  ['components/Steps/StepsIndicator.tsx', 1]
])

// A Tailwind hover variant, after any other variant, on a named group, or in
// an arbitrary selector, but not a `(hover:hover)` media gate.
const HOVER_CLASS =
  /(?:^|[\s'"`:\]*])(?:group-|peer-|has-|in-|not-)?hover(?:\/[\w-]+)?:(?=[\w[(!*-])|\[&:hover\]/

const SOURCES = import.meta.glob<string>(
  ['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true }
)

const hoverLines = (source: string) =>
  source
    .split('\n')
    .flatMap((line, index) => (HOVER_CLASS.test(line) ? [index + 1] : []))

describe('component hover states', () => {
  it('come from interaction utilities, never hover classes', () => {
    const handRolled = Object.entries(SOURCES).flatMap(([path, source]) => {
      const file = path.slice(2)
      const lines = hoverLines(source)
      if (lines.length === ALLOWED.get(file)) return []
      return lines.map((line) => `${file}:${line}`)
    })
    expect(handRolled).toEqual([])
  })

  it('reads every source, and each allowed file still has its exception', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100)
    for (const [file, count] of ALLOWED) {
      expect(hoverLines(SOURCES[`./${file}`] ?? '')).toHaveLength(count)
    }
  })

  it.each([
    "'text-subtle hover:text-normal'",
    "'group-hover:text-subtle'",
    "'group-hover/card:scale-105'",
    "'data-selected:hover:[--x:1]'",
    "'data-[state=open]:hover:bg-subtle'",
    "'[&:hover]:underline'",
    "'*:hover:underline'"
  ])('catches %s', (line) => {
    expect(HOVER_CLASS.test(line)).toBe(true)
  })

  it.each(["'[@media(hover:hover)]:bg-subtle'", '@media (hover: hover) {'])(
    'ignores %s',
    (line) => {
      expect(HOVER_CLASS.test(line)).toBe(false)
    }
  )
})
