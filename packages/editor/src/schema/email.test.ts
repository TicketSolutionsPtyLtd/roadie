import { getSchema } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'

import { type JSONContent, migrate, presets } from './index'

const schema = getSchema(presets.email)

const text = (value: string): JSONContent => ({ type: 'text', text: value })
const p = (value: string): JSONContent => ({
  type: 'paragraph',
  content: [text(value)]
})
const column = (...content: JSONContent[]): JSONContent => ({
  type: 'column',
  content
})
const columns = (...content: JSONContent[]): JSONContent => ({
  type: 'columns',
  content
})
const section = (...content: JSONContent[]): JSONContent => ({
  type: 'section',
  content
})
const button = (href: unknown, label = 'Get tickets'): JSONContent => ({
  type: 'button',
  attrs: { href },
  content: [text(label)]
})
const image = (src: string, width: unknown = null) => ({
  type: 'image',
  attrs: { src, alt: 'The crowd at sunset', width }
})
const list = (...items: JSONContent[][]): JSONContent => ({
  type: 'bulletList',
  content: items.map((content) => ({ type: 'listItem', content }))
})
const doc = (...content: JSONContent[]) => ({ type: 'doc', content })

const poster = 'https://assets.oztix.com.au/ochre-kite-weekender.webp'
const tickets = 'https://www.oztix.com.au/ochre-kite-weekender'

const newsletter = doc(
  {
    type: 'heading',
    attrs: { level: 2 },
    content: [text('Ochre Kite Weekender')]
  },
  p('Doors open 7pm.'),
  section(
    columns(
      column(image(poster, 280)),
      column(p('Two stages, one weekend.'), button(tickets))
    ),
    p('All ages.')
  ),
  { type: 'spacer', attrs: { height: 32 } },
  { type: 'horizontalRule' },
  list([p('Bar')], [p('Food trucks')])
)

function parse(content: JSONContent) {
  const node = Node.fromJSON(schema, content)
  node.check()
  return node
}

function readEmail(content: JSONContent) {
  return migrate({ version: 1, preset: 'email', doc: content }).doc
}

describe('presets.email', () => {
  it('names its nodes and marks', () => {
    expect(Object.keys(schema.nodes).sort()).toEqual([
      'bulletList',
      'button',
      'column',
      'columns',
      'doc',
      'hardBreak',
      'heading',
      'horizontalRule',
      'image',
      'listItem',
      'orderedList',
      'paragraph',
      'section',
      'spacer',
      'text'
    ])
    expect(Object.keys(schema.marks).sort()).toEqual([
      'bold',
      'italic',
      'link',
      'underline'
    ])
  })

  it.each([
    ['button', ['href']],
    ['image', ['src', 'alt', 'width']],
    ['spacer', ['height']],
    ['section', []],
    ['columns', []],
    ['column', []]
  ])('saves only these attrs of a %s', (name, attrs) => {
    expect(Object.keys(schema.nodes[name]!.spec.attrs ?? {})).toEqual(attrs)
  })

  it('reads a newsletter with sections, columns, a button, an image, a spacer and a divider', () => {
    expect(parse(newsletter).toJSON()).toEqual(newsletter)
  })

  it.each([
    ['a column outside columns', doc(column(p('x')))],
    ['a section in a section', doc(section(section(p('x'))))],
    ['one column', doc(columns(column(p('x'))))],
    [
      'five columns',
      doc(columns(...Array.from({ length: 5 }, () => column(p('x')))))
    ],
    [
      'columns in a column',
      doc(
        columns(column(columns(column(p('x')), column(p('y')))), column(p('z')))
      )
    ],
    ['a button in a list item', doc(list([p('x'), button(tickets)]))],
    ['an image in a list item', doc(list([p('x'), image(poster)]))],
    [
      'a quote',
      doc({ type: 'blockquote', content: [p('Best weekend of the year.')] })
    ],
    ['an embed', doc({ type: 'embed', attrs: { provider: 'x', id: 'y' } })],
    ['a table', doc({ type: 'table', content: [] })]
  ])('rejects %s', (_, content) => {
    expect(() => parse(content)).toThrow()
  })

  function pastedAttrs(name: string, element: object) {
    for (const rule of schema.nodes[name]!.spec.parseDOM ?? []) {
      const attrs = rule.getAttrs?.(element as HTMLElement) ?? {}
      if (attrs !== false) return attrs
    }
    return false
  }

  const pastedImage = (src: string) => ({
    getAttribute: (name: string) => (name === 'src' ? src : null)
  })
  const pastedButton = (href: string) => ({
    getAttribute: (name: string) => (name === 'href' ? href : null)
  })

  it.each([
    ['/images/crowd.webp', false],
    ['http://assets.oztix.com.au/crowd.webp', false],
    [poster, expect.objectContaining({ src: poster })]
  ])('reads a pasted image from %s as %j', (src, read) => {
    expect(pastedAttrs('image', pastedImage(src))).toEqual(read)
  })

  it.each([
    [tickets, { href: tickets }],
    ['mailto:hello@example.com', { href: 'mailto:hello@example.com' }],
    ['tel:+61700000000', { href: 'tel:+61700000000' }],
    ['javascript:alert(1)', false],
    ['/ochre-kite-weekender', false],
    ['mailto:', false],
    ['https://', false]
  ])('reads a pasted button to %s as %j', (href, read) => {
    expect(pastedAttrs('button', pastedButton(href))).toEqual(read)
  })

  it('holds a button’s label as unmarked text', () => {
    const marked = doc({
      type: 'button',
      attrs: { href: tickets },
      content: [{ type: 'text', text: 'Go', marks: [{ type: 'bold' }] }]
    })

    expect(() => parse(marked)).toThrow()
  })

  it('reads a pasted spacer with no height at the default height', () => {
    expect(pastedAttrs('spacer', { getAttribute: () => null })).toEqual({
      height: 32
    })
  })

  it('reads a pasted h1 as an h2', () => {
    expect(
      schema.nodes.heading!.spec.parseDOM?.find((rule) => rule.tag === 'h1')
        ?.attrs
    ).toEqual({ level: 2 })
  })
})

describe('migrate and the email preset', () => {
  it('keeps a newsletter unchanged', () => {
    expect(readEmail(newsletter)).toEqual(newsletter)
  })

  it.each([
    [
      'a column outside columns as its blocks',
      doc(column(p('a'))),
      doc(p('a'))
    ],
    [
      'a section in a section as its blocks',
      doc(section(section(p('a')), p('b'))),
      doc(section(p('a'), p('b')))
    ],
    ['one column as its blocks', doc(columns(column(p('a')))), doc(p('a'))],
    [
      'five columns as their blocks, stacked',
      doc(columns(...['a', 'b', 'c', 'd', 'e'].map((t) => column(p(t))))),
      doc(...['a', 'b', 'c', 'd', 'e'].map(p))
    ],
    [
      'a block beside columns as a column of its own',
      doc(columns(column(p('a')), p('b'))),
      doc(columns(column(p('a')), column(p('b'))))
    ],
    [
      'an empty column as one paragraph',
      doc(columns(column(), column(p('b')))),
      doc(columns(column({ type: 'paragraph' }), column(p('b'))))
    ],
    [
      'columns in a column as their blocks',
      doc(
        columns(column(columns(column(p('a')), column(p('b')))), column(p('c')))
      ),
      doc(columns(column(p('a'), p('b')), column(p('c'))))
    ],
    [
      'a button in a list item as its label',
      doc(list([p('a'), button(tickets)])),
      doc(list([p('a'), p('Get tickets')]))
    ],
    [
      'a table as the text of its cells',
      doc({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [{ type: 'tableCell', content: [p('7pm')] }]
          }
        ]
      }),
      doc(p('7pm'))
    ],
    [
      'a quote as its paragraphs',
      doc({ type: 'blockquote', content: [p('Best weekend of the year.')] }),
      doc(p('Best weekend of the year.'))
    ]
  ])('reads %s', (_, stored, read) => {
    expect(readEmail(stored)).toEqual(read)
  })

  it.each([
    ['javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['/ochre-kite-weekender'],
    ['ftp://example.com'],
    ['mailto:'],
    [null]
  ])('reads a button to %j as a paragraph of its label', (href) => {
    expect(readEmail(doc(button(href)))).toEqual(doc(p('Get tickets')))
  })

  it('keeps a button’s label as unmarked text', () => {
    const stored = doc({
      type: 'button',
      attrs: { href: tickets, label: 'Old' },
      content: [
        { type: 'text', text: 'Get ', marks: [{ type: 'bold' }] },
        { type: 'hardBreak' },
        text('tickets')
      ]
    })

    expect(readEmail(stored)).toEqual(
      doc({
        type: 'button',
        attrs: { href: tickets },
        content: [text('Get '), text('tickets')]
      })
    )
  })

  it('drops a button with no text and no link', () => {
    expect(
      readEmail(doc(p('a'), { type: 'button', attrs: { href: null } }))
    ).toEqual(doc(p('a')))
  })

  it.each([
    ['mailto:hello@example.com'],
    ['tel:+61700000000'],
    ['http://www.oztix.com.au']
  ])('keeps a button to %s', (href) => {
    expect(readEmail(doc(button(href)))).toEqual(doc(button(href)))
  })

  it('drops an image from a path on the site, which a mail client can’t load', () => {
    const stored = doc(p('a'), image('/images/crowd.webp'))

    expect(readEmail(stored)).toEqual(doc(p('a')))
    expect(migrate({ version: 1, preset: 'rich', doc: stored }).doc).toEqual(
      doc(p('a'), {
        type: 'image',
        attrs: { src: '/images/crowd.webp', alt: 'The crowd at sunset' }
      })
    )
  })

  it.each([
    [300, 300],
    [600, 600],
    [601, null],
    [0, null],
    [1.5, null],
    ['300', null],
    [undefined, null]
  ])('reads an image width of %j as %j', (width, read) => {
    expect(readEmail(doc(image(poster, width)))).toEqual(
      doc(image(poster, read))
    )
  })

  it.each([
    [40, 40],
    [40.4, 40],
    [2, 8],
    [500, 160],
    ['40', 32],
    [undefined, 32]
  ])('reads a spacer height of %j as %j', (height, read) => {
    expect(readEmail(doc({ type: 'spacer', attrs: { height } }))).toEqual(
      doc({ type: 'spacer', attrs: { height: read } })
    )
  })

  it('reads an email into the rich preset, keeping its text and a button’s label', () => {
    expect(
      migrate({ version: 1, preset: 'email', doc: newsletter }, 'rich').doc
    ).toEqual(
      doc(
        newsletter.content[0]!,
        p('Doors open 7pm.'),
        {
          type: 'image',
          attrs: { src: poster, alt: 'The crowd at sunset' }
        },
        p('Two stages, one weekend.'),
        p('Get tickets'),
        p('All ages.'),
        { type: 'horizontalRule' },
        list([p('Bar')], [p('Food trucks')])
      )
    )
  })
})
