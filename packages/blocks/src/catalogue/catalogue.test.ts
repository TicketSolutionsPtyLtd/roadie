import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { catalogue, groups } from '.'

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
      block.presets.map((preset) => [
        `${block.name} ${preset.name}`,
        preset.thumbnail
      ])
    )
  )('has a thumbnail for %s', (_, thumbnail) => {
    expect(existsSync(join(SRC, 'thumbnails', thumbnail))).toBe(true)
  })

  it('puts every block in a group', () => {
    const names = groups.map((group) => group.name)
    for (const block of catalogue) {
      expect(names, block.name).toContain(block.group)
    }
  })

  it('stands each block for its first preset', () => {
    for (const block of catalogue) {
      expect(block.thumbnail).toBe(block.presets[0]?.thumbnail)
    }
  })

  // A CMS hides every field a preset doesn't list, so a limit on an unlisted
  // field could never be seen.
  it('lists the fields each preset reads, and limits only those', () => {
    for (const block of catalogue) {
      for (const preset of block.presets) {
        const label = `${block.name} ${preset.name}`
        expect(preset.fields, label).toContain('title')
        expect(new Set(preset.fields).size, label).toBe(preset.fields.length)
        for (const field of Object.keys(preset.limits ?? {})) {
          expect(preset.fields, label).toContain(field)
        }
      }
    }
  })

  it('gives every preset a unique name', () => {
    for (const block of catalogue) {
      const names = block.presets.map((preset) => preset.name)
      expect(new Set(names).size, block.name).toBe(names.length)
    }
  })

  it('has a block for every thumbnail', () => {
    const expected = catalogue.flatMap((block) =>
      block.presets.map((preset) => preset.thumbnail)
    )
    const files = readdirSync(join(SRC, 'thumbnails')).filter((file) =>
      file.endsWith('.svg')
    )

    expect(files.sort()).toEqual(expected.sort())
  })
})
