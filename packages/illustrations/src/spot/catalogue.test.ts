import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { SPOT_ILLUSTRATIONS } from './catalogue'
import * as Spot from './index'
import { componentName, labelOf } from './names'

const svgs = readdirSync(fileURLToPath(new URL('./svgs/', import.meta.url)))
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.slice(0, -4))
  .sort()

describe('SPOT_ILLUSTRATIONS', () => {
  it('lists every source once, with a component the package exports', () => {
    expect(SPOT_ILLUSTRATIONS.map((i) => i.slug).sort()).toEqual(svgs)
    for (const { name } of SPOT_ILLUSTRATIONS)
      expect(Spot, name).toHaveProperty(name)
  })

  it('gives each one tags to search by', () => {
    for (const { slug, tags } of SPOT_ILLUSTRATIONS)
      expect(tags.length, slug).toBeGreaterThan(0)
  })
})

describe('names', () => {
  it.each([
    ['arrow-up-right', 'ArrowUpRight', 'Arrow up right'],
    ['letter-a', 'LetterA', 'Letter A'],
    ['number-0', 'Number0', 'Number 0'],
    ['badge-of-honour', 'BadgeOfHonour', 'Badge of honour']
  ])('names %s %s, or %s in words', (slug, name, label) => {
    expect(componentName(slug)).toBe(name)
    expect(labelOf(slug)).toBe(label)
  })
})
