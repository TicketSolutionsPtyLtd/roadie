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

  it('limits every preset with actions to two of them', () => {
    for (const block of catalogue) {
      for (const preset of block.presets) {
        if (!preset.fields.includes('actions')) continue
        expect(preset.limits?.actions, `${block.name} ${preset.name}`).toEqual({
          max: 2
        })
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

  it('lists preset in every preset, so a CMS stores it even where a block has one', () => {
    for (const block of catalogue) {
      for (const preset of block.presets) {
        expect(preset.fields, `${block.name} ${preset.name}`).toContain(
          'preset'
        )
      }
    }
  })

  it('gives Gallery images their size, for an image component that needs it', () => {
    for (const preset of catalogue.find((block) => block.name === 'gallery')!
      .presets) {
      expect(preset.itemFields, preset.name).toEqual(
        expect.arrayContaining(['width', 'height'])
      )
    }
  })

  // The fields that hold an object, or a list of them, beyond each block's own items.
  const OBJECT_FIELDS: Record<string, readonly string[]> = {
    hero: ['actions', 'image', 'images', 'video', 'poster', 'partner', 'logo'],
    'rich-text': ['actions'],
    'side-by-side': ['actions', 'image', 'stats', 'figures'],
    'alternating-rows': ['actions', 'image'],
    cards: ['actions', 'image'],
    faq: ['actions'],
    stats: ['actions'],
    testimonial: ['actions', 'image', 'person', 'organisation', 'logo'],
    gallery: ['actions', 'images'],
    mosaic: ['actions', 'image', 'logo', 'logoTile', 'logos'],
    'call-to-action': ['actions', 'image']
  }

  it('lists the object fields of every block in the catalogue', () => {
    expect(Object.keys(OBJECT_FIELDS).sort()).toEqual(
      catalogue.map((block) => block.name).sort()
    )
  })

  it.each(Object.entries(OBJECT_FIELDS))(
    'describes the fields inside every object field of %s',
    (name, fields) => {
      const block = catalogue.find((candidate) => candidate.name === name)!
      expect(Object.keys(block.shapes).sort()).toEqual([...fields].sort())
      for (const inner of Object.values(block.shapes))
        expect(inner.length, name).toBeGreaterThan(0)
    }
  )

  it('describes an image as its source, text, and size', () => {
    const hero = catalogue.find((block) => block.name === 'hero')!
    expect(hero.shapes.image).toEqual([
      'src',
      'alt',
      'width',
      'height',
      'blurDataURL'
    ])
    expect(hero.shapes.actions).toEqual(['label', 'href', 'icon'])
  })

  it("keeps a block's own shape over the shared image fields", () => {
    const gallery = catalogue.find((block) => block.name === 'gallery')!
    expect(gallery.shapes.images).toContain('href')
  })
})
