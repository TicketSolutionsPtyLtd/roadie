import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { catalogue, thumbnailFile } from '.'

const SRC = join(import.meta.dirname, '..')
const toKebab = (pascal: string) =>
  pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
const NOT_BLOCKS = new Set(['Provider'])

describe('catalogue', () => {
  it('lists every block folder', () => {
    const blocks = readdirSync(SRC, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^[A-Z]/.test(entry.name))
      .filter((entry) => !NOT_BLOCKS.has(entry.name))
      .map((entry) => toKebab(entry.name))

    expect(catalogue.map((block) => block.name).sort()).toEqual(blocks.sort())
  })

  it.each(
    catalogue.flatMap((block) =>
      block.presets.map((preset) => [block.name, preset.name])
    )
  )('has a thumbnail for %s %s', (block, preset) => {
    expect(
      existsSync(join(SRC, 'thumbnails', thumbnailFile(block, preset)))
    ).toBe(true)
  })

  it('keeps every block to two variants and unique preset names', () => {
    for (const block of catalogue) {
      const variants = new Set(block.presets.map((preset) => preset.variant))
      const names = block.presets.map((preset) => preset.name)
      expect(variants.size, block.name).toBeLessThanOrEqual(2)
      expect(new Set(names).size, block.name).toBe(names.length)
    }
  })

  it('has a block for every thumbnail', () => {
    const expected = catalogue.flatMap((block) =>
      block.presets.map((preset) => thumbnailFile(block.name, preset.name))
    )
    const files = readdirSync(join(SRC, 'thumbnails')).filter((file) =>
      file.endsWith('.svg')
    )

    expect(files.sort()).toEqual(expected.sort())
  })
})
