import { describe, expect, it } from 'vitest'

import { importLosses } from './importLosses'

const none = {
  dropped: [],
  restyled: { styles: 0, tables: 0 },
  unknownMergeTags: []
}

describe('importLosses', () => {
  it('says nothing when everything comes across', () => {
    expect(importLosses(none)).toEqual([])
  })

  it.each([
    [
      { ...none, restyled: { styles: 1, tables: 0 } },
      '1 style, such as a font or colour'
    ],
    [
      { ...none, restyled: { styles: 12, tables: 0 } },
      '12 styles, such as fonts and colours'
    ],
    [
      { ...none, restyled: { styles: 0, tables: 1 } },
      '1 table’s layout, keeping its text'
    ],
    [
      { ...none, restyled: { styles: 0, tables: 3 } },
      '3 tables’ layouts, keeping their text'
    ],
    [
      { ...none, dropped: [{ kind: 'image' as const, src: 'http://x' }] },
      '1 image that isn’t on https'
    ],
    [
      {
        ...none,
        dropped: [{ kind: 'image' as const }, { kind: 'image' as const }]
      },
      '2 images that aren’t on https'
    ],
    [
      {
        ...none,
        dropped: [{ kind: 'embed' as const }, { kind: 'media' as const }]
      },
      '2 videos or embeds'
    ],
    [
      { ...none, dropped: [{ kind: 'hidden' as const }] },
      '1 piece of hidden text, such as a preheader'
    ],
    [
      { ...none, dropped: [{ kind: 'link' as const, src: 'https://x' }] },
      '1 link on an image'
    ],
    [
      {
        ...none,
        dropped: [{ kind: 'unsafe-link' as const, src: 'javascript:x()' }]
      },
      '1 link to an address an email can’t open, keeping its text'
    ],
    [
      {
        ...none,
        dropped: [
          { kind: 'unsafe-link' as const },
          { kind: 'unsafe-link' as const }
        ]
      },
      '2 links to addresses an email can’t open, keeping their text'
    ],
    [
      {
        ...none,
        dropped: [
          { kind: 'element' as const, tag: 'mj-accordion' },
          { kind: 'element' as const, tag: 'mj-carousel' },
          { kind: 'element' as const, tag: 'mj-accordion' }
        ]
      },
      'The look of mj-accordion and mj-carousel, keeping their text'
    ],
    [
      {
        ...none,
        dropped: [{ kind: 'element' as const, tag: 'mj-carousel' }]
      },
      'The look of mj-carousel, keeping its text'
    ],
    [
      { ...none, unknownMergeTags: ['#Promoter#'] },
      '1 merge tag this editor doesn’t know, kept as text: #Promoter#'
    ],
    [
      { ...none, unknownMergeTags: ['#Promoter#', '{{ venue }}'] },
      '2 merge tags this editor doesn’t know, kept as text: #Promoter#, {{ venue }}'
    ]
  ])('lists %j as “%s”', (imported, line) => {
    expect(importLosses(imported)).toEqual([line])
  })

  it('lists losses from the most to the least noticed', () => {
    expect(
      importLosses({
        dropped: [{ kind: 'hidden' }, { kind: 'image' }],
        restyled: { styles: 2, tables: 1 },
        unknownMergeTags: ['#Promoter#']
      })
    ).toEqual([
      '1 image that isn’t on https',
      '1 merge tag this editor doesn’t know, kept as text: #Promoter#',
      '1 table’s layout, keeping its text',
      '2 styles, such as fonts and colours',
      '1 piece of hidden text, such as a preheader'
    ])
  })
})
