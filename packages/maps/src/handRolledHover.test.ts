/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest'

// The same pattern as the guard in roadie-components, which reads only its
// own sources. Maps has no exceptions.
const HOVER_CLASS =
  /(?:^|[\s'"`:\]*])(?:group-|peer-|has-|in-|not-)?hover(?:\/[\w-]+)?:(?=[\w[(!*-])|\[(?![^\]]*@media)[^\]\s]*:hover(?![a-z])[^\]\s]*\]/

const SOURCES = import.meta.glob<string>(
  ['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true }
)

describe('map hover states', () => {
  it('come from interaction utilities, never hover classes', () => {
    const handRolled = Object.entries(SOURCES).flatMap(([path, source]) =>
      source
        .split('\n')
        .flatMap((line, index) =>
          HOVER_CLASS.test(line) ? [`${path.slice(2)}:${index + 1}`] : []
        )
    )
    expect(handRolled).toEqual([])
  })

  it('reads every source', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(20)
  })

  it.each(["'text-subtle hover:text-normal'", "'[&:hover]:underline'"])(
    'catches %s',
    (line) => {
      expect(HOVER_CLASS.test(line)).toBe(true)
    }
  )
})
