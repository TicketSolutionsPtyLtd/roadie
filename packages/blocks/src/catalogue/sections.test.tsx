import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AlternatingRows } from '../AlternatingRows'
import { CallToAction } from '../CallToAction'
import { Cards } from '../Cards'
import { FAQ } from '../FAQ'
import { Gallery } from '../Gallery'
import { Hero } from '../Hero'
import { Mosaic } from '../Mosaic'
import { RichText } from '../RichText'
import { SideBySide } from '../SideBySide'
import { Stats } from '../Stats'
import { Testimonial } from '../Testimonial'
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

  const everyBlock = () =>
    catalogueSections({
      components: {
        'alternating-rows': AlternatingRows,
        'call-to-action': CallToAction,
        cards: Cards,
        faq: FAQ,
        gallery: Gallery,
        hero: Hero,
        mosaic: Mosaic,
        'rich-text': RichText,
        'side-by-side': SideBySide,
        stats: Stats,
        testimonial: Testimonial
      }
    })

  it.each(
    everyBlock().flatMap((section) =>
      section.templates.map((template) => [template.label, section, template])
    )
  )(
    'draws a new %s section, before anything’s added to it',
    (_, section, template) => {
      const { render, attrs } = section as ReturnType<typeof everyBlock>[number]
      expect(() =>
        renderToStaticMarkup(
          render({
            attrs: { ...attrs, ...(template as { attrs: object }).attrs }
          })
        )
      ).not.toThrow()
    }
  )

  it('draws a section whose saved list isn’t one', () => {
    const stats = everyBlock().find(({ label }) => label === 'Stats')!

    expect(() =>
      renderToStaticMarkup(
        stats.render({ attrs: { ...stats.attrs, stats: 'x', actions: {} } })
      )
    ).not.toThrow()
  })

  it.each([
    ['Call to action', 'cta'],
    ['Call to action', 'banner'],
    ['FAQ', 'questions'],
    ['FAQ', 'accordion']
  ])('finds %s by %s', (label, word) => {
    const section = everyBlock().find((entry) => entry.label === label)!

    expect(
      section.templates.every(({ keywords }) => keywords?.includes(word))
    ).toBe(true)
  })

  it('shows what a block draws while align, size and colour are unset', () => {
    const defaults = Object.fromEntries(
      hero().settings.flatMap((setting) =>
        setting.type === 'choice' && setting.defaultValue
          ? [[setting.name, setting.defaultValue]]
          : []
      )
    )

    expect(defaults).toMatchObject({
      align: 'start',
      size: 'lg',
      intent: 'neutral'
    })
  })

  it('names a section’s alignment as an image’s and a button’s are', () => {
    const align = hero().settings.find((setting) => setting.name === 'align')

    expect(
      align?.type === 'choice' && align.options.map(({ label }) => label)
    ).toEqual(['Left', 'Centre'])
  })

  const settingOf = (label: string, name: string) =>
    everyBlock()
      .find((section) => section.label === label)!
      .settings.find((setting) => setting.name === name)

  it('edits a block’s items as a list, each with its own fields', () => {
    const cards = settingOf('Cards', 'cards')

    expect(cards).toMatchObject({ type: 'list', itemLabel: 'Card' })
    expect(
      cards?.type === 'list' &&
        cards.fields?.map(({ name, type }) => [name, type])
    ).toEqual(
      expect.arrayContaining([
        ['title', 'text'],
        ['description', 'text'],
        ['image', 'image'],
        ['href', 'text']
      ])
    )
    expect(settingOf('FAQ', 'questions')).toMatchObject({
      type: 'list',
      itemLabel: 'Question'
    })
  })

  it('edits only what each preset’s items hold, up to its own limit', () => {
    const cards = everyBlock()
      .find(({ label }) => label === 'Cards')!
      .settings.filter(({ name }) => name === 'cards')
    const shown = (preset: string) =>
      cards.find((setting) => setting.available?.({ preset }))

    expect(shown('text-blocks')).toMatchObject({ max: 4 })
    expect(shown('plain')).not.toHaveProperty('max')
    const lists = shown('lists')
    expect(
      lists?.type === 'list' && lists.fields?.map(({ name }) => name)
    ).toEqual(['title', 'href'])
  })

  it('draws no image or button that hasn’t been filled in', () => {
    const hero = everyBlock().find(({ label }) => label === 'Hero')!
    const attrs = { ...hero.attrs, preset: 'title', title: 'Kazoo Hollow' }

    expect(
      renderToStaticMarkup(
        hero.render({
          attrs: { ...attrs, actions: [{ label: '', href: '' }] }
        })
      )
    ).toBe(renderToStaticMarkup(hero.render({ attrs })))
  })

  it('draws a button being added while editing, by its label or as Button, before it has a link', () => {
    const hero = everyBlock().find(({ label }) => label === 'Hero')!
    const attrs = {
      ...hero.attrs,
      preset: 'title',
      title: 'Kazoo Hollow',
      actions: [
        { label: 'Tickets', href: '' },
        { label: '', href: '' }
      ]
    }

    const editing = renderToStaticMarkup(hero.render({ attrs, editing: true }))

    expect(editing).toContain('>Tickets<')
    expect(editing).toContain('>Button<')
    expect(renderToStaticMarkup(hero.render({ attrs }))).not.toContain(
      'Tickets'
    )
  })

  it('opens the question being edited', () => {
    const faq = everyBlock().find(({ label }) => label === 'FAQ')!
    const attrs = {
      ...faq.attrs,
      questions: [
        { question: 'When do doors open?', answer: '7pm.' },
        { question: 'Is there parking?', answer: 'On Ann Street.' }
      ]
    }

    const opened = (editingItem?: string) => {
      const host = document.createElement('div')
      host.innerHTML = renderToStaticMarkup(
        faq.render({ attrs, editing: true, editingItem })
      )
      return [...host.querySelectorAll('details')].map(({ open }) => open)
    }

    expect(opened('questions.1.answer')).toEqual([false, true])
    expect(opened()).toEqual([false, false])
  })

  it('edits buttons and images, up to a preset’s limit', () => {
    expect(settingOf('Hero', 'actions')).toMatchObject({
      type: 'list',
      item: 'action',
      max: 2
    })
    expect(settingOf('Hero', 'image')).toMatchObject({ type: 'image' })
    expect(settingOf('Hero', 'images')).toMatchObject({
      type: 'list',
      item: 'image'
    })
    expect(settingOf('Gallery', 'images')).toMatchObject({
      type: 'list',
      item: 'image'
    })
  })

  it('shows no surface as the Surface default, and draws it as none', () => {
    const stats = everyBlock().find(({ label }) => label === 'Stats')!
    const surface = settingOf('Stats', 'emphasis')

    expect(surface).toMatchObject({ defaultValue: 'none' })
    expect(
      renderToStaticMarkup(
        stats.render({ attrs: { ...stats.attrs, emphasis: 'none' } })
      )
    ).toBe(renderToStaticMarkup(stats.render({ attrs: stats.attrs })))
  })

  it('hints at a blank item, and shows a placeholder photo, only while editing', () => {
    const cards = everyBlock().find(({ label }) => label === 'Cards')!
    const attrs = {
      ...cards.attrs,
      preset: 'photo',
      cards: [{ title: '', subtitle: '' }]
    }

    const editing = renderToStaticMarkup(cards.render({ attrs, editing: true }))
    const page = renderToStaticMarkup(cards.render({ attrs }))

    expect(editing).toContain('>Card<')
    expect(editing).toContain('data-slot="block-image-placeholder"')
    expect(page).not.toContain('>Card<')
    expect(page).not.toContain('block-image-placeholder')
  })

  // Saved attrs are untrusted, and a public page renders them.
  describe.each([false, true])(
    'with editing %s, from saved JSON',
    (editing) => {
      const hero = () => everyBlock().find(({ label }) => label === 'Hero')!
      const draw = (attrs: Record<string, unknown>) =>
        renderToStaticMarkup(
          hero().render({
            attrs: { ...hero().attrs, title: 'Kazoo Hollow', ...attrs },
            editing
          })
        )

      it('draws a button whose icon names a prototype key', () => {
        const html = draw({
          preset: 'title',
          actions: [{ label: 'Tickets', href: '/tickets', icon: 'constructor' }]
        })

        expect(html).toContain('>Tickets<')
      })

      it('draws a button with no object for its label', () => {
        expect(() =>
          draw({
            preset: 'title',
            actions: [{ label: { text: 'Tickets' }, href: '/tickets' }]
          })
        ).not.toThrow()
      })

      it('draws an image with a string style, without passing it on', () => {
        const html = draw({
          preset: 'image',
          image: { src: '/photo.webp', alt: 'A crowd', style: 'color: red' }
        })

        expect(html).toContain('/photo.webp')
      })

      const photo = { src: '/photo.webp', alt: 'A crowd' }
      it.each([
        ['Hero', { preset: 'bento' }],
        ['Call to action', { preset: 'photo', image: photo }],
        ['Rich text', { preset: 'statement' }],
        ['Cards', { preset: 'plain', cards: [{ title: 'Camping' }] }],
        ['Stats', { stats: [{ value: '40', label: 'Stalls' }] }]
      ])(
        'draws %s with an illustration named after a prototype key',
        (label, attrs: Record<string, unknown>) => {
          const section = everyBlock().find((entry) => entry.label === label)!
          const named = (list: string) =>
            Array.isArray(attrs[list])
              ? {
                  [list]: (attrs[list] as object[]).map((item) => ({
                    ...item,
                    illustration: 'constructor'
                  }))
                }
              : {}

          expect(() =>
            renderToStaticMarkup(
              section.render({
                attrs: {
                  ...section.attrs,
                  ...attrs,
                  illustration: 'constructor',
                  ...named('cards'),
                  ...named('stats')
                },
                editing
              })
            )
          ).not.toThrow()
        }
      )

      it('draws a section whose choices name prototype keys', () => {
        expect(() =>
          draw({
            preset: 'constructor',
            align: 'constructor',
            size: '__proto__',
            emphasis: 'toString',
            intent: 'constructor'
          })
        ).not.toThrow()
      })

      it('draws a card whose title is an object', () => {
        const cards = everyBlock().find(({ label }) => label === 'Cards')!

        expect(() =>
          renderToStaticMarkup(
            cards.render({
              attrs: {
                ...cards.attrs,
                preset: 'plain',
                cards: [
                  { title: { text: 'Camping' }, description: 'By the stage' }
                ]
              },
              editing
            })
          )
        ).not.toThrow()
      })
    }
  )

  it('shows a placeholder for a section’s own photo only while editing', () => {
    const hero = everyBlock().find(({ label }) => label === 'Hero')!
    const attrs = { ...hero.attrs, preset: 'image', title: 'Kazoo Hollow' }

    const editing = renderToStaticMarkup(hero.render({ attrs, editing: true }))
    const page = renderToStaticMarkup(hero.render({ attrs }))

    expect(editing).toContain('data-slot="block-image-placeholder"')
    expect(page).not.toContain('block-image-placeholder')
  })

  it.each([
    ['Hero', 'event'],
    ['Call to action', 'tickets'],
    ['Cards', 'lineup'],
    ['Gallery', 'gallery']
  ])('finds %s by %s too', (label, word) => {
    const section = everyBlock().find((entry) => entry.label === label)!

    expect(section.templates[0]!.keywords).toContain(word)
  })

  it('saves no id, so a copy never repeats one', () => {
    expect(everyBlock().some(({ attrs }) => 'id' in attrs)).toBe(false)
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
