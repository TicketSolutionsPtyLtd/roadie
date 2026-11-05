import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CallToAction } from '../CallToAction'
import { Hero } from '../Hero'
import { catalogueSections } from './sections'

const thumbnailUrl = (file: string) => `/thumbnails/${file}`

const sectionsOf = () =>
  catalogueSections({
    components: { hero: Hero, 'call-to-action': CallToAction },
    thumbnailUrl
  })

const hero = () => sectionsOf().find(({ label }) => label === 'Hero')!

describe('catalogueSections', () => {
  it('offers only the blocks it’s given, each named for the saved value', () => {
    expect(sectionsOf().map(({ name, label }) => [name, label])).toEqual([
      ['heroSection', 'Hero'],
      ['callToActionSection', 'Call to action']
    ])
  })

  it('gives each preset a template, with its thumbnail', () => {
    expect(
      hero().templates!.map(({ label, thumbnail, attrs }) => [
        label,
        thumbnail,
        attrs?.preset
      ])
    ).toEqual([
      ['Hero: Bento', '/thumbnails/hero-bento.svg', 'bento'],
      ['Hero: Image', '/thumbnails/hero-image.svg', 'image'],
      ['Hero: Title', '/thumbnails/hero-title.svg', 'title'],
      ['Hero: Partner', '/thumbnails/hero-partner.svg', 'partner']
    ])
  })

  it('draws a section with its block, from its attrs', () => {
    const { render, attrs } = hero()

    const html = renderToStaticMarkup(
      render({ attrs: { ...attrs, preset: 'title', title: 'Kazoo Hollow' } })
    )

    expect(html).toContain('data-block="hero"')
    expect(html).toContain('data-preset="title"')
    expect(html).toContain('Kazoo Hollow')
  })

  it('shows only the settings the section’s preset reads', () => {
    const { settings } = hero()
    const shown = (preset: string) =>
      settings!
        .filter((setting) => setting.available?.({ preset }) ?? true)
        .map(({ name }) => name)

    expect(shown('bento')).not.toContain('eyebrow')
    expect(shown('title')).toEqual(
      expect.arrayContaining(['preset', 'eyebrow', 'title', 'description'])
    )
  })

  it('starts each template with the app’s content, over its own', () => {
    const [heroSection] = catalogueSections({
      components: { hero: Hero },
      content: (block, preset) =>
        preset.name === 'title' ? { title: `${block.title} title` } : {}
    })

    expect(
      heroSection!.templates!.find(({ attrs }) => attrs?.preset === 'title')
        ?.attrs
    ).toMatchObject({ title: 'Hero title' })
  })
})
