import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BRAND_ILLUSTRATIONS } from './brand-illustrations'
import { SPOT_ILLUSTRATION_NAMES } from './spot-illustrations'

const FOLDER = join(import.meta.dirname, '../../public/brand/illustrations')

describe('BRAND_ILLUSTRATIONS', () => {
  it('lists every SVG in the folder once, and nothing else', () => {
    const files = readdirSync(FOLDER)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.replace(/\.svg$/, ''))
      .sort()
    const slugs = BRAND_ILLUSTRATIONS.map(({ slug }) => slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect([...slugs].sort()).toEqual(files)
  })

  it('gives every illustration a sentence case label and a tag', () => {
    for (const { slug, label, tags } of BRAND_ILLUSTRATIONS) {
      expect(label, slug).toMatch(/^[A-Z0-9][^A-Z]*$/)
      expect(tags.length, slug).toBeGreaterThan(0)
    }
  })

  it('names only components @oztix/roadie-illustrations/spot exports', () => {
    const exported = new Set<string>(SPOT_ILLUSTRATION_NAMES)
    const unknown = BRAND_ILLUSTRATIONS.filter(
      ({ component }) => component && !exported.has(component)
    ).map(({ slug, component }) => `${slug}: ${component}`)
    expect(unknown).toEqual([])
  })
})
