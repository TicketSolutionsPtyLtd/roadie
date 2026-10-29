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
      'text',
      'variable'
    ])
    expect(Object.keys(schema.marks).sort()).toEqual([
      'bold',
      'italic',
      'link',
      'underline'
    ])
  })

  it.each([
    ['button', ['href', 'showWhen']],
    ['image', ['src', 'alt', 'width', 'showWhen']],
    ['spacer', ['height', 'showWhen']],
    ['horizontalRule', ['showWhen']],
    ['variable', ['key', 'fallback']],
    ['section', ['showWhen']],
    ['columns', []],
    ['column', []]
  ])('saves only these attrs of a %s', (name, attrs) => {
    expect(Object.keys(schema.nodes[name]!.spec.attrs ?? {})).toEqual(attrs)
  })

  it('reads a newsletter with sections, columns, a button, an image, a spacer and a divider', () => {
    expect(readEmail(parse(newsletter).toJSON())).toEqual(newsletter)
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

const variable = (attrs: Record<string, unknown>): JSONContent => ({
  type: 'variable',
  attrs
})
const hi = (attrs: Record<string, unknown>): JSONContent => ({
  type: 'paragraph',
  content: [text('Hi '), variable(attrs)]
})
const greeting = (attrs: Record<string, unknown>) => doc(hi(attrs))

describe('a variable in the email preset', () => {
  it('sits inline in text and in a button’s label', () => {
    expect(() =>
      parse(
        doc(hi({ key: 'first_name', fallback: 'there' }), {
          type: 'button',
          attrs: { href: tickets },
          content: [text('Tickets for '), variable({ key: 'first_name' })]
        })
      )
    ).not.toThrow()
  })

  it.each([
    [
      { 'data-key': 'first_name', 'data-fallback': 'there' },
      { key: 'first_name', fallback: 'there' }
    ],
    [{ 'data-key': 'first_name' }, { key: 'first_name' }],
    [{ 'data-key': '' }, false]
  ])('reads a pasted variable with %j as %j', (attributes, read) => {
    const element = {
      getAttribute: (name: string) =>
        (attributes as Record<string, string>)[name] ?? null
    } as unknown as HTMLElement
    const [rule] = schema.nodes.variable!.spec.parseDOM ?? []
    const attrs = rule?.getAttrs?.(element)
    expect(attrs === false ? false : JSON.parse(JSON.stringify(attrs))).toEqual(
      read
    )
  })

  it('keeps its key and a fallback that is text', () => {
    expect(
      readEmail(
        greeting({ key: 'first_name', fallback: 'there', token: '#x#' })
      )
    ).toEqual(greeting({ key: 'first_name', fallback: 'there' }))
  })

  it.each([
    ['an empty fallback', ''],
    ['a fallback that isn’t text', 7],
    ['no fallback', null]
  ])('drops %s', (_name, fallback) => {
    expect(readEmail(greeting({ key: 'first_name', fallback }))).toEqual(
      greeting({ key: 'first_name' })
    )
  })

  it.each([
    ['no key', {}],
    ['an empty key', { key: '' }],
    ['a key that isn’t text', { key: 7 }]
  ])('drops a variable with %s', (_name, attrs) => {
    expect(readEmail(greeting(attrs))).toEqual(doc(p('Hi ')))
  })

  it('keeps a variable in a button’s label, unmarked', () => {
    const label = (marks?: JSONContent['marks']) => ({
      type: 'button',
      attrs: { href: tickets },
      content: [
        text('Tickets for '),
        { ...variable({ key: 'first_name' }), ...(marks && { marks }) }
      ]
    })
    expect(readEmail(doc(label([{ type: 'bold' }])))).toEqual(doc(label()))
  })

  it('drops a variable read into the rich preset, keeping the text around it', () => {
    expect(
      migrate(
        {
          version: 1,
          preset: 'email',
          doc: greeting({ key: 'first_name' })
        },
        'rich'
      ).doc
    ).toEqual(doc(p('Hi ')))
  })
})

const nearlySoldOut = { key: 'tickets_left', op: 'lessThan', value: 20 }
const ruled = (node: JSONContent, showWhen: unknown): JSONContent => ({
  ...node,
  attrs: { ...node.attrs, showWhen }
})
const spacer: JSONContent = { type: 'spacer', attrs: { height: 32 } }
const divider: JSONContent = { type: 'horizontalRule' }

describe('a rule for showing a block in the email preset', () => {
  it.each([
    ['section', section(p('Only 20 tickets left'))],
    ['button', button(tickets)],
    ['image', image(poster)],
    ['spacer', spacer],
    ['divider', divider]
  ])('sits on a %s', (_name, node) => {
    const value = doc(ruled(node, nearlySoldOut))
    expect(() => parse(value)).not.toThrow()
    expect(readEmail(value)).toEqual(value)
  })

  it.each([
    ['exists', { key: 'vip', op: 'exists' }],
    ['equals text', { key: 'ticket_type', op: 'equals', value: 'VIP' }],
    ['equals a number', { key: 'tickets_left', op: 'equals', value: 0 }],
    ['notEquals', { key: 'ticket_type', op: 'notEquals', value: 'VIP' }],
    ['lessThan', nearlySoldOut],
    ['greaterThan', { key: 'tickets_left', op: 'greaterThan', value: -1.5 }]
  ])('keeps a rule that %s', (_name, rule) => {
    const value = doc(ruled(button(tickets), rule))
    expect(readEmail(value)).toEqual(value)
  })

  it('keeps only a rule’s key, op and value', () => {
    expect(
      readEmail(
        doc(
          ruled(divider, { op: 'exists', key: 'vip', value: 'x', liquid: '' }),
          ruled(divider, { ...nearlySoldOut, token: '{{ x }}' })
        )
      )
    ).toEqual(
      doc(
        ruled(divider, { key: 'vip', op: 'exists' }),
        ruled(divider, nearlySoldOut)
      )
    )
  })

  it.each([
    ['isn’t an object', 'tickets_left < 20'],
    ['is a list', [nearlySoldOut]],
    ['has no key', { op: 'exists' }],
    ['has an empty key', { key: '', op: 'exists' }],
    ['has a key that isn’t text', { key: 7, op: 'exists' }],
    ['has an unknown op', { key: 'tickets_left', op: 'atMost', value: 20 }],
    ['equals nothing', { key: 'ticket_type', op: 'equals' }],
    ['equals empty text', { key: 'ticket_type', op: 'equals', value: '' }],
    ['equals a list', { key: 'ticket_type', op: 'equals', value: ['VIP'] }],
    [
      'compares with text',
      { key: 'tickets_left', op: 'lessThan', value: '20' }
    ],
    ['compares with NaN', { key: 'tickets_left', op: 'lessThan', value: NaN }],
    [
      'compares with infinity',
      { key: 'tickets_left', op: 'greaterThan', value: Infinity }
    ]
  ])('drops a rule that %s, keeping its block', (_name, rule) => {
    expect(readEmail(doc(ruled(button(tickets), rule)))).toEqual(
      doc(button(tickets))
    )
    expect(readEmail(doc(ruled(divider, rule)))).toEqual(doc(divider))
  })

  it('reads a block with no rule as it was', () => {
    expect(readEmail(newsletter)).toEqual(newsletter)
    expect(readEmail(doc(divider))).toEqual(doc({ type: 'horizontalRule' }))
  })

  it.each([
    ['columns', columns(column(p('a')), column(p('b')))],
    ['a paragraph', p('a')]
  ])('never keeps a rule on %s', (_name, node) => {
    expect(readEmail(doc(ruled(node, nearlySoldOut)))).toEqual(doc(node))
  })

  it('never keeps a rule on a column', () => {
    const row = (first: JSONContent) => doc(columns(first, column(p('b'))))
    expect(readEmail(row(ruled(column(p('a')), nearlySoldOut)))).toEqual(
      row(column(p('a')))
    )
  })

  it('drops a rule read into the rich preset, keeping its block', () => {
    expect(
      migrate(
        {
          version: 1,
          preset: 'email',
          doc: doc(ruled(divider, nearlySoldOut))
        },
        'rich'
      ).doc
    ).toEqual(doc(divider))
  })

  it.each([
    ['a rule', JSON.stringify(nearlySoldOut), nearlySoldOut],
    ['a malformed rule', JSON.stringify({ key: 'vip', op: 'is' }), undefined],
    ['text that isn’t JSON', '{ key: vip', undefined],
    ['no rule', null, undefined]
  ])('reads a pasted block with %s', (_name, attribute, read) => {
    const element = {
      getAttribute: (name: string) =>
        name === 'data-show-when' ? attribute : null
    } as unknown as HTMLElement
    const [rule] = schema.nodes.horizontalRule!.spec.parseDOM ?? []
    const attrs = rule?.getAttrs?.(element)
    expect(attrs && attrs.showWhen).toEqual(read)
  })

  it.each([
    ['section', section(p('a')), 'div'],
    ['button', button(tickets), 'a'],
    ['image', image(poster), 'img'],
    ['spacer', spacer, 'div'],
    ['divider', divider, 'hr']
  ])('writes a %s’s rule for pasting elsewhere', (_name, node, tag) => {
    const parsed = parse(doc(ruled(node, nearlySoldOut))).firstChild!
    const [written, attributes] = parsed.type.spec.toDOM!(parsed) as [
      string,
      Record<string, string>
    ]
    expect(written).toBe(tag)
    expect(JSON.parse(attributes['data-show-when']!)).toEqual(nearlySoldOut)
  })

  it('writes nothing for a block with no rule', () => {
    const parsed = parse(doc(divider)).firstChild!
    const [, attributes = {}] = parsed.type.spec.toDOM!(parsed) as [
      string,
      Record<string, string>?
    ]
    expect(attributes).not.toHaveProperty('data-show-when')
  })
})
