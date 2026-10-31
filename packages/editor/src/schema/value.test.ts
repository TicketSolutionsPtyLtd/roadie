import { getSchema } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'

import {
  CURRENT_VERSION,
  type JSONContent,
  createEmptyValue,
  migrate,
  presets
} from './index'

const doc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
  ]
}

describe('migrate', () => {
  it('returns a current value unchanged', () => {
    const value = { version: 1, preset: 'basic', doc }

    expect(migrate(value)).toEqual({ version: 1, preset: 'basic', doc })
  })

  it.each([
    ['an unknown preset', { version: 1, preset: 'fancy', doc }, /preset/],
    [
      'a version newer than this package',
      { version: 2, preset: 'basic', doc },
      /version 2/
    ],
    ['a version below 1', { version: 0, preset: 'basic', doc }, /version 0/],
    [
      'a fractional version',
      { version: 1.5, preset: 'basic', doc },
      /version 1.5/
    ]
  ])('rejects %s', (_, value, message) => {
    expect(() => migrate(value)).toThrow(message)
  })
})

const linked = (href: unknown, extraAttrs?: object) => ({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Get ' },
        {
          type: 'text',
          marks: [
            { type: 'bold' },
            { type: 'link', attrs: { href, ...extraAttrs } }
          ],
          text: 'tickets'
        }
      ]
    }
  ]
})

const unlinked = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Get ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'tickets' }
      ]
    }
  ]
}

describe('migrate and links', () => {
  it('keeps a safe link', () => {
    const doc = linked('https://www.oztix.com.au/ochre-kite-weekender')

    expect(migrate({ version: 1, preset: 'basic', doc }).doc).toEqual(doc)
  })

  it('keeps only the href of a link', () => {
    const href = 'https://www.oztix.com.au/ochre-kite-weekender'
    const doc = linked(href, { target: '_blank' })

    expect(migrate({ version: 1, preset: 'basic', doc }).doc).toEqual(
      linked(href)
    )
  })

  it.each([
    ['javascript:alert(1)'],
    ['java\tscript:alert(1)'],
    ['  JAVASCRIPT:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['vbscript:msgbox(1)'],
    [undefined]
  ])('drops a link to %j and keeps its text', (href) => {
    const value = { version: 1, preset: 'basic', doc: linked(href) }

    expect(migrate(value).doc).toEqual(unlinked)
  })
})

describe('migrate and underline', () => {
  it.each([['basic'], ['rich']])(
    'keeps underlined text in a %s value',
    (preset) => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [{ type: 'bold' }, { type: 'underline' }],
                text: 'No refunds'
              }
            ]
          }
        ]
      }

      expect(migrate({ version: 1, preset, doc }).doc).toEqual(doc)
    }
  )

  it('keeps the first underline and none of its attrs', () => {
    const value = {
      version: 1,
      preset: 'basic',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [
                  { type: 'underline', attrs: { style: 'color: red' } },
                  { type: 'underline' }
                ],
                text: 'No refunds'
              }
            ]
          }
        ]
      }
    }

    expect(migrate(value).doc.content?.[0]?.content).toEqual([
      { type: 'text', marks: [{ type: 'underline' }], text: 'No refunds' }
    ])
  })
})

describe('createEmptyValue', () => {
  it('starts a basic value at the current version with one empty paragraph', () => {
    expect(createEmptyValue('basic')).toEqual({
      version: CURRENT_VERSION,
      preset: 'basic',
      doc: { type: 'doc', content: [{ type: 'paragraph' }] }
    })
  })
})

const headed = (level: unknown) => ({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level },
      content: [{ type: 'text', text: 'Lineup' }]
    }
  ]
})

describe('migrate and headings', () => {
  it.each([
    [1, 2],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 4],
    [6, 4],
    ['3', 2],
    [undefined, 2]
  ])('reads a stored level %j as %j', (stored, level) => {
    const value = { version: 1, preset: 'rich', doc: headed(stored) }

    expect(migrate(value).doc).toEqual(headed(level))
  })
})

const pictured = (attrs: Record<string, unknown>) => ({
  type: 'doc',
  content: [
    { type: 'image', attrs },
    { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
  ]
})

describe('migrate and images', () => {
  it.each([
    ['https://assets.example.com/crowd.webp'],
    ['HTTPS://assets.example.com/crowd.webp'],
    ['/images/crowd.webp']
  ])('keeps an image at %s', (src) => {
    const doc = pictured({ src, alt: 'The crowd at sunset' })

    expect(migrate({ version: 1, preset: 'rich', doc }).doc).toEqual(doc)
  })

  it('stores missing alt text as empty', () => {
    const doc = pictured({ src: '/images/crowd.webp' })

    expect(migrate({ version: 1, preset: 'rich', doc }).doc).toEqual(
      pictured({ src: '/images/crowd.webp', alt: '' })
    )
  })

  it.each([
    ['http:', 'http://assets.example.com/crowd.webp'],
    ['a protocol-relative URL', '//evil.test/crowd.webp'],
    ['a backslash after the slash', '/\\evil.test/crowd.webp'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:image/svg+xml,<svg onload=alert(1)>'],
    ['a relative path', 'crowd.webp'],
    ['a space', 'https://assets.example.com/a b.webp'],
    ['no src', undefined]
  ])('drops an image at %s', (_, src) => {
    const value = {
      version: 1,
      preset: 'rich',
      doc: pictured({ src, alt: 'x' })
    }

    expect(migrate(value).doc.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ])
  })
})

const embedded = (attrs?: Record<string, unknown>) => ({
  type: 'doc',
  content: [
    { type: 'embed', attrs },
    { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
  ]
})

describe('migrate and embeds', () => {
  it.each([
    [{ provider: 'youtube', id: 'exampleVid1', params: null }],
    [{ provider: 'vimeo', id: '76979871', params: { h: '8272103f6e' } }],
    [{ provider: 'loom', id: '0123456789abcdef0123456789abcdef', params: null }]
  ])('keeps an embed of %o', (attrs) => {
    const doc = embedded(attrs)

    expect(migrate({ version: 1, preset: 'rich', doc }).doc).toEqual(doc)
  })

  it.each([
    ['no provider', { id: 'exampleVid1' }],
    ['a numeric id', { provider: 'youtube', id: 42 }],
    [
      'a param that isn’t text',
      { provider: 'vimeo', id: '1', params: { h: {} } }
    ],
    ['no attrs', undefined]
  ])('drops an embed with %s', (_, attrs) => {
    const value = { version: 1, preset: 'rich', doc: embedded(attrs) }

    expect(migrate(value).doc.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ])
  })

  it('keeps only the provider, id and params of an embed', () => {
    const doc = embedded({
      provider: 'youtube',
      id: 'exampleVid1',
      src: 'https://evil.test',
      onload: 'alert(1)'
    })

    expect(migrate({ version: 1, preset: 'rich', doc }).doc).toEqual(
      embedded({ provider: 'youtube', id: 'exampleVid1', params: null })
    )
  })
})

const paragraphOf = (paragraph: Record<string, unknown>) => ({
  type: 'doc',
  content: [{ type: 'paragraph', ...paragraph }]
})

describe('migrate and malformed JSON', () => {
  it.each([
    ['content that isn’t a list', { content: 'x' }, {}],
    [
      'a null child',
      { content: [null, { type: 'text', text: 'Doors 7pm' }] },
      { content: [{ type: 'text', text: 'Doors 7pm' }] }
    ],
    [
      'a child that isn’t an object',
      { content: [42, 'x', { type: 'text', text: 'Doors 7pm' }] },
      { content: [{ type: 'text', text: 'Doors 7pm' }] }
    ],
    [
      'a null mark',
      { content: [{ type: 'text', marks: [null], text: 'Doors' }] },
      { content: [{ type: 'text', marks: [], text: 'Doors' }] }
    ],
    [
      'marks that aren’t a list',
      { content: [{ type: 'text', marks: 'bold', text: 'Doors' }] },
      { content: [{ type: 'text', text: 'Doors' }] }
    ]
  ])('skips %s', (_, stored, expected) => {
    const value = { version: 1, preset: 'basic', doc: paragraphOf(stored) }

    expect(migrate(value).doc).toEqual(paragraphOf(expected))
  })

  it.each([
    ['a null value', null],
    ['a value that isn’t an object', 'x'],
    ['a null doc', { version: 1, preset: 'basic', doc: null }],
    ['a doc that isn’t an object', { version: 1, preset: 'basic', doc: 'x' }]
  ])('throws a RangeError on %s', (_, value) => {
    expect(() => migrate(value as never)).toThrow(RangeError)
  })
})

const textOf = (text: string, marks?: unknown[]) => ({
  type: 'text',
  ...(marks && { marks }),
  text
})

const docOf = (...content: object[]): JSONContent => ({
  type: 'doc',
  content: content as JSONContent[]
})

const para = (text?: string) => ({
  type: 'paragraph',
  ...(text && { content: [textOf(text)] })
})
const cellOf = (...content: object[]) => ({ type: 'tableCell', content })
const headerOf = (...content: object[]) => ({ type: 'tableHeader', content })
const rowOf = (...content: object[]) => ({ type: 'tableRow', content })
const tableOf = (...content: object[]) => ({ type: 'table', content })
const lineup = tableOf(
  rowOf(headerOf(para('Time')), headerOf(para('Act'))),
  rowOf(cellOf(para('9pm')), cellOf(para('Ochre Kite')))
)

describe('migrate and tables', () => {
  it('keeps a table with a header row, its marks and links', () => {
    const doc = docOf(
      tableOf(
        rowOf({
          type: 'tableHeader',
          attrs: { colspan: 2, rowspan: 1 },
          content: [para('Set times')]
        }),
        rowOf(
          cellOf({
            type: 'paragraph',
            content: [
              textOf('9pm', [
                { type: 'bold' },
                { type: 'link', attrs: { href: 'https://www.oztix.com.au' } }
              ])
            ]
          }),
          { type: 'tableCell', attrs: { rowspan: 2 }, content: [para('Act')] }
        )
      )
    )

    expect(migrate({ version: 1, preset: 'rich', doc }).doc).toEqual(doc)
  })

  it.each([
    [
      'a row with no cells, dropping it',
      tableOf(rowOf(), ...lineup.content),
      lineup
    ],
    ['a table with no rows, dropping it', tableOf(), []],
    [
      'a table whose rows have no cells, dropping it',
      tableOf(rowOf(), rowOf()),
      []
    ],
    [
      'a cell with no content, giving it a paragraph',
      tableOf(rowOf(cellOf(), { type: 'tableHeader' })),
      tableOf(rowOf(cellOf(para()), headerOf(para())))
    ],
    [
      'a cell holding a heading, a list and a quote, keeping their text as paragraphs',
      tableOf(
        rowOf(
          cellOf(
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [textOf('Lineup')]
            },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [para('Bar')] },
                { type: 'listItem', content: [para('Cloakroom')] }
              ]
            },
            { type: 'blockquote', content: [para('Loud')] }
          )
        )
      ),
      tableOf(
        rowOf(
          cellOf(para('Lineup'), para('Bar'), para('Cloakroom'), para('Loud'))
        )
      )
    ],
    [
      'a cell holding a table, keeping its cells’ text as paragraphs',
      tableOf(rowOf(cellOf(lineup))),
      tableOf(
        rowOf(
          cellOf(para('Time'), para('Act'), para('9pm'), para('Ochre Kite'))
        )
      )
    ],
    [
      'a cell holding only an image, an embed and a divider, leaving a paragraph',
      tableOf(
        rowOf(
          cellOf(
            { type: 'image', attrs: { src: '/images/crowd.webp', alt: '' } },
            {
              type: 'embed',
              attrs: { provider: 'youtube', id: 'exampleVid1' }
            },
            { type: 'horizontalRule' }
          )
        )
      ),
      tableOf(rowOf(cellOf(para())))
    ],
    [
      'loose text in a cell, keeping it as a paragraph',
      tableOf(rowOf(cellOf(textOf('9pm')))),
      tableOf(rowOf(cellOf(para('9pm'))))
    ],
    [
      'a row holding a paragraph, keeping it in a cell',
      tableOf(rowOf(para('9pm'), cellOf(para('Ochre Kite')))),
      tableOf(rowOf(cellOf(para('9pm')), cellOf(para('Ochre Kite'))))
    ],
    [
      'a row inside a row, keeping each of its cells',
      tableOf(rowOf(rowOf(headerOf(para('Time')), cellOf(para('9pm'))))),
      tableOf(rowOf(headerOf(para('Time')), cellOf(para('9pm'))))
    ],
    [
      'a row holding an image only, dropping the row',
      tableOf(
        rowOf({ type: 'image', attrs: { src: '/images/crowd.webp' } }),
        ...lineup.content
      ),
      lineup
    ],
    [
      'cells straight in a table, keeping them in a row',
      tableOf(cellOf(para('9pm')), headerOf(para('Act')), ...lineup.content),
      tableOf(
        rowOf(cellOf(para('9pm')), headerOf(para('Act'))),
        ...lineup.content
      )
    ],
    [
      'a paragraph straight in a table, keeping it in a cell of a row',
      tableOf(para('Doors 7pm')),
      tableOf(rowOf(cellOf(para('Doors 7pm'))))
    ],
    [
      'a row outside a table, keeping its cells’ text as paragraphs',
      rowOf(cellOf(para('9pm')), headerOf(para('Act'))),
      [para('9pm'), para('Act')]
    ],
    [
      'a cell outside a table, keeping its paragraphs',
      cellOf(para('9pm')),
      para('9pm')
    ]
  ])('reshapes %s', (_, stored, expected) => {
    const value = {
      version: 1,
      preset: 'rich',
      doc: docOf(stored, para('Doors 7pm'))
    }

    const { doc: migrated } = migrate(value)

    expect(migrated).toEqual(docOf(...[expected].flat(), para('Doors 7pm')))
    expect(() =>
      Node.fromJSON(getSchema(presets.rich), migrated).check()
    ).not.toThrow()
  })

  it.each([
    [
      'a colwidth, an alignment and a style',
      { colwidth: [120], align: 'center', style: 'color: red' },
      undefined
    ],
    [
      'spans of 2 and 3',
      { colspan: 2, rowspan: 3 },
      { colspan: 2, rowspan: 3 }
    ],
    ['spans of 0 and -1', { colspan: 0, rowspan: -1 }, undefined],
    ['fractional spans', { colspan: 1.5, rowspan: Number.NaN }, undefined],
    ['spans as text', { colspan: '2', rowspan: '1' }, undefined],
    [
      'spans at the most HTML allows',
      { colspan: 1000, rowspan: 65534 },
      { colspan: 1000, rowspan: 65534 }
    ],
    [
      'spans past what HTML allows',
      { colspan: 1001, rowspan: 65535 },
      undefined
    ],
    ['spans of a billion', { colspan: 1e9, rowspan: 1e9 }, undefined],
    [
      'a rowspan HTML allows but a colspan it doesn’t',
      { colspan: 1001, rowspan: 1001 },
      { rowspan: 1001 }
    ],
    [
      'one whole span and one not',
      { colspan: 2, rowspan: null },
      { colspan: 2 }
    ]
  ])(
    'keeps only the spans HTML allows of a cell with %s',
    (_, stored, kept) => {
      const value = {
        version: 1,
        preset: 'rich',
        doc: docOf(
          tableOf(
            rowOf(
              { type: 'tableHeader', attrs: stored, content: [para('Act')] },
              { type: 'tableCell', attrs: stored, content: [para('9pm')] }
            )
          )
        )
      }

      expect(migrate(value).doc).toEqual(
        docOf(
          tableOf(
            rowOf(
              {
                type: 'tableHeader',
                ...(kept && { attrs: kept }),
                content: [para('Act')]
              },
              {
                type: 'tableCell',
                ...(kept && { attrs: kept }),
                content: [para('9pm')]
              }
            )
          )
        )
      )
    }
  )

  it('reads a table into a basic value, keeping each cell’s text as paragraphs', () => {
    const value = { version: 1, preset: 'rich', doc: docOf(lineup) }

    expect(migrate(value, 'basic').doc).toEqual(
      docOf(para('Time'), para('Act'), para('9pm'), para('Ochre Kite'))
    )
  })
})

describe('migrate and nodes or marks outside the preset', () => {
  it.each([
    [
      'an unknown mark, keeping its text',
      docOf({
        type: 'paragraph',
        content: [textOf('Sold out', [{ type: 'strike' }, { type: 'bold' }])]
      }),
      docOf({
        type: 'paragraph',
        content: [textOf('Sold out', [{ type: 'bold' }])]
      })
    ],
    [
      'an unknown block holding text, keeping it as a paragraph',
      docOf({ type: 'callout', content: [textOf('Doors 7pm')] }),
      docOf({ type: 'paragraph', content: [textOf('Doors 7pm')] })
    ],
    [
      'an unknown block holding blocks, keeping them',
      docOf({
        type: 'details',
        content: [{ type: 'paragraph', content: [textOf('Doors 7pm')] }]
      }),
      docOf({ type: 'paragraph', content: [textOf('Doors 7pm')] })
    ],
    [
      'an unknown block with no text',
      docOf(
        { type: 'iframe', attrs: { src: 'https://evil.test' } },
        { type: 'paragraph', content: [textOf('Doors 7pm')] }
      ),
      docOf({ type: 'paragraph', content: [textOf('Doors 7pm')] })
    ],
    [
      'an unknown inline node, keeping the text around it',
      docOf({
        type: 'paragraph',
        content: [
          textOf('Doors '),
          { type: 'mention', attrs: { id: 'x' } },
          textOf('7pm')
        ]
      }),
      docOf({
        type: 'paragraph',
        content: [textOf('Doors '), textOf('7pm')]
      })
    ],
    [
      'a heading, a quote and a divider, keeping their text as paragraphs',
      docOf(
        { type: 'heading', attrs: { level: 2 }, content: [textOf('Lineup')] },
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [textOf('Loud')] }]
        },
        { type: 'horizontalRule' }
      ),
      docOf(
        { type: 'paragraph', content: [textOf('Lineup')] },
        { type: 'paragraph', content: [textOf('Loud')] }
      )
    ],
    [
      'an image and an embed',
      docOf(
        { type: 'image', attrs: { src: '/images/crowd.webp', alt: '' } },
        { type: 'embed', attrs: { provider: 'youtube', id: 'exampleVid1' } },
        { type: 'paragraph', content: [textOf('Doors 7pm')] }
      ),
      docOf({ type: 'paragraph', content: [textOf('Doors 7pm')] })
    ],
    [
      'an empty or missing text node',
      docOf({
        type: 'paragraph',
        content: [textOf(''), { type: 'text' }, textOf('Doors 7pm')]
      }),
      docOf({ type: 'paragraph', content: [textOf('Doors 7pm')] })
    ]
  ])('drops %s from a basic value', (_, stored, expected) => {
    const value = { version: 1, preset: 'basic', doc: stored }

    expect(migrate(value).doc).toEqual(expected)
  })

  it.each([['basic'], ['rich']] as const)(
    'unwraps a doc below the root of a %s value to its blocks',
    (preset) => {
      const value = {
        version: 1,
        preset,
        doc: docOf(
          { type: 'doc', content: [para('Doors 7pm')] },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'doc', content: [para('Bar')] }]
              }
            ]
          }
        )
      }

      expect(migrate(value).doc).toEqual(
        docOf(para('Doors 7pm'), {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [para('Bar')] }]
        })
      )
    }
  )

  it('reads a value into another preset, dropping what that preset can’t hold', () => {
    const value = {
      version: 1,
      preset: 'rich',
      doc: docOf(
        { type: 'heading', attrs: { level: 2 }, content: [textOf('Lineup')] },
        { type: 'paragraph', content: [textOf('Doors 7pm')] }
      )
    }

    expect(migrate(value, 'basic')).toEqual({
      version: 1,
      preset: 'basic',
      doc: docOf(
        { type: 'paragraph', content: [textOf('Lineup')] },
        { type: 'paragraph', content: [textOf('Doors 7pm')] }
      )
    })
  })

  it.each([
    [
      'blocks it can’t hold, keeping each one’s text apart',
      docOf(
        { type: 'heading', attrs: { level: 2 }, content: [textOf('Lineup')] },
        { type: 'heading', attrs: { level: 3 }, content: [textOf('Doors')] }
      ),
      docOf(
        { type: 'paragraph', content: [textOf('Lineup')] },
        { type: 'paragraph', content: [textOf('Doors')] }
      )
    ],
    [
      'a list holding what isn’t a list item, wrapping each in one',
      docOf({
        type: 'bulletList',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [textOf('Bar')] },
          { type: 'paragraph', content: [textOf('Cloakroom')] }
        ]
      }),
      docOf({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [textOf('Bar')] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [textOf('Cloakroom')] }]
          }
        ]
      })
    ],
    [
      'a list item outside a list, keeping its blocks',
      docOf({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [textOf('Bar')] }]
      }),
      docOf({ type: 'paragraph', content: [textOf('Bar')] })
    ],
    [
      'a block inside a paragraph, keeping its text inline',
      docOf({
        type: 'paragraph',
        content: [
          textOf('Doors '),
          { type: 'heading', attrs: { level: 2 }, content: [textOf('7pm')] }
        ]
      }),
      docOf({
        type: 'paragraph',
        content: [textOf('Doors '), textOf('7pm')]
      })
    ],
    [
      'content inside a leaf',
      docOf({ type: 'hardBreak', content: [textOf('x')] }),
      docOf({ type: 'paragraph', content: [{ type: 'hardBreak' }] })
    ],
    [
      'children of an unknown node that aren’t a list',
      docOf(
        { type: 'callout', content: 'Doors' },
        { type: 'paragraph', content: [textOf('7pm')] }
      ),
      docOf({ type: 'paragraph', content: [textOf('7pm')] })
    ]
  ])('reshapes %s into a basic value', (_, stored, expected) => {
    const value = { version: 1, preset: 'rich', doc: stored }
    const { doc: migrated } = migrate(value, 'basic')

    expect(migrated).toEqual(expected)
    expect(() =>
      getSchema(presets.basic).nodeFromJSON(migrated).check()
    ).not.toThrow()
  })

  it('throws a RangeError on an unknown stored preset, even with a target', () => {
    const value = { version: 1, preset: 'fancy', doc: docOf() }

    expect(() => migrate(value as never, 'basic')).toThrow(RangeError)
  })

  it.each([['constructor'], ['__proto__'], ['toString']])(
    'throws a RangeError on a preset named %s',
    (preset) => {
      const value = { version: 1, preset, doc: docOf() }

      expect(() => migrate(value as never)).toThrow(RangeError)
    }
  )

  it('throws a RangeError on an unknown target preset', () => {
    const value = { version: 1, preset: 'basic', doc: docOf() }

    expect(() => migrate(value, 'fancy' as never)).toThrow(RangeError)
  })

  const image = { type: 'image', attrs: { src: '/images/crowd.webp' } }
  const embed = {
    type: 'embed',
    attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' }
  }
  const itemOf = (...content: object[]) => ({ type: 'listItem', content })
  const bulletsOf = (...content: object[]) => ({ type: 'bulletList', content })
  const loadable: [string, object[]][] = [
    [
      'unknown nodes, marks and loose list text',
      [
        { type: 'callout', content: [textOf('Doors', [{ type: 'code' }])] },
        bulletsOf(
          { type: 'heading', content: [textOf('Bar')] },
          textOf('Cloakroom')
        ),
        { type: 'paragraph', content: [{ type: 'paragraph' }, textOf('!')] }
      ]
    ],
    [
      'a list item starting with a heading',
      [bulletsOf(itemOf({ type: 'heading', content: [textOf('Bar')] }))]
    ],
    ['a list item starting with an image', [bulletsOf(itemOf(image))]],
    ['a list item starting with an embed', [bulletsOf(itemOf(embed))]],
    ['a doc with no blocks', []],
    ['an image alone', [image]],
    ['an embed alone', [embed]],
    ['an empty bulleted list', [bulletsOf()]],
    ['a numbered list with no content', [{ type: 'orderedList' }]],
    ['an empty list item', [bulletsOf(itemOf())]],
    [
      'a list item emptied by an unsafe image',
      [bulletsOf(itemOf({ type: 'image', attrs: { src: 'javascript:x' } }))]
    ],
    ['an empty quote', [{ type: 'blockquote', content: [] }]],
    ['a table', [lineup]],
    [
      'a doc inside a table cell',
      [tableOf(rowOf(cellOf({ type: 'doc', content: [para('9pm')] })))]
    ],
    [
      'a doc inside a quote',
      [{ type: 'blockquote', content: [{ type: 'doc', content: [para('x')] }] }]
    ],
    ['a doc inside a doc', [{ type: 'doc', content: [para('x')] }]],
    ['a table with no rows', [tableOf()]],
    ['a table with an empty row', [tableOf(rowOf())]],
    ['a table with an empty cell', [tableOf(rowOf(cellOf()))]],
    [
      'a table cell holding blocks a cell can’t hold',
      [
        tableOf(
          rowOf(
            cellOf(
              { type: 'heading', content: [textOf('Lineup')] },
              bulletsOf(itemOf(para('Bar'))),
              image,
              embed,
              lineup
            )
          )
        )
      ]
    ],
    ['a table row holding a paragraph', [tableOf(rowOf(para('9pm')))]],
    ['a table holding a paragraph', [tableOf(para('9pm'))]],
    ['a table cell outside a row', [tableOf(cellOf(para('9pm')))]],
    ['a table row outside a table', [rowOf(cellOf(para('9pm')))]],
    ['a table cell outside a table', [headerOf(para('Act'))]],
    ['a table inside a list item', [bulletsOf(itemOf(para('Set'), lineup))]],
    ['a table row inside a list', [bulletsOf(rowOf(cellOf(para('9pm'))))]],
    [
      'a table row starting a list item',
      [bulletsOf(itemOf(rowOf(cellOf(para('9pm')))))]
    ],
    [
      'a table row inside a quote',
      [{ type: 'blockquote', content: [rowOf(cellOf(para('9pm')))] }]
    ],
    [
      'table cells with widths and bad spans',
      [
        tableOf(
          rowOf({
            type: 'tableCell',
            attrs: { colwidth: [100], colspan: 0, rowspan: '2' },
            content: [para('9pm')]
          })
        )
      ]
    ],
    [
      'a mark twice',
      [
        {
          type: 'paragraph',
          content: [textOf('Doors', [{ type: 'bold' }, { type: 'bold' }])]
        }
      ]
    ],
    [
      'an underline twice',
      [
        {
          type: 'paragraph',
          content: [
            textOf('Doors', [{ type: 'underline' }, { type: 'underline' }])
          ]
        }
      ]
    ],
    [
      'marks on blocks',
      [
        {
          type: 'paragraph',
          marks: [{ type: 'bold' }],
          content: [textOf('x')]
        },
        {
          type: 'bulletList',
          marks: [{ type: 'italic' }],
          content: [itemOf({ type: 'paragraph', content: [textOf('y')] })]
        }
      ]
    ],
    [
      'attributes outside the preset',
      [
        {
          type: 'orderedList',
          attrs: { start: 1, foo: 'bar' },
          content: [
            itemOf({
              type: 'paragraph',
              content: [
                textOf('Tickets', [
                  { type: 'bold', attrs: { x: 1 } },
                  {
                    type: 'link',
                    attrs: {
                      href: 'https://www.oztix.com.au',
                      target: '_blank'
                    }
                  }
                ])
              ]
            })
          ]
        }
      ]
    ]
  ]

  it('saves only the attrs a node keeps, and no other keys', () => {
    const value = {
      version: 1,
      preset: 'basic',
      doc: docOf(
        {
          type: 'orderedList',
          attrs: { start: 1, foo: 'bar' },
          extra: true,
          content: [itemOf({ type: 'paragraph', text: 'oops', foo: 1 })]
        },
        { type: 'paragraph', marks: [{ type: 'bold' }], content: [textOf('x')] }
      )
    }

    expect(migrate(value).doc.content).toEqual([
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }]
      },
      { type: 'paragraph', content: [textOf('x')] }
    ])
  })

  it.each([
    ['a string', 'x'],
    ['a fraction', 1.5],
    ['NaN', Number.NaN]
  ])('drops an ordered list start that is %s', (_, start) => {
    const value = {
      version: 1,
      preset: 'basic',
      doc: docOf({
        type: 'orderedList',
        attrs: { start, type: { a: 1 } },
        content: [itemOf({ type: 'paragraph', content: [textOf('One')] })]
      })
    }

    expect(migrate(value).doc.content?.[0]).toEqual({
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [textOf('One')] }]
        }
      ]
    })
  })

  it('keeps an image’s marks off it', () => {
    const value = {
      version: 1,
      preset: 'rich',
      doc: docOf({
        type: 'image',
        marks: [{ type: 'bold' }],
        attrs: { src: '/a.png', alt: '' }
      })
    }

    expect(() =>
      Node.fromJSON(getSchema(presets.rich), migrate(value).doc).check()
    ).not.toThrow()
  })

  it.each(
    (['basic', 'rich'] as const).flatMap((preset) =>
      loadable.map(([name, content]) => [preset, name, content] as const)
    )
  )('gives a %s value Tiptap can load from %s', (preset, _, content) => {
    const value = { version: 1, preset: 'rich', doc: docOf(...content) }
    const schema = getSchema(presets[preset])

    expect(() =>
      Node.fromJSON(schema, migrate(value, preset).doc).check()
    ).not.toThrow()
  })
})

describe('migrate and block ids', () => {
  const withId = (id: unknown, text = 'Doors 7pm') => ({
    type: 'paragraph',
    attrs: { blockId: id },
    content: [textOf(text)]
  })

  it('keeps each block’s id in a blocks value', () => {
    const stored = docOf(
      {
        type: 'heading',
        attrs: { level: 2, blockId: 'b1' },
        content: [textOf('Lineup')]
      },
      withId('b2'),
      {
        type: 'embed',
        attrs: {
          provider: 'youtube',
          id: 'exampleVid1',
          params: null,
          blockId: 'b3'
        }
      }
    )

    expect(migrate({ version: 1, preset: 'blocks', doc: stored }).doc).toEqual(
      stored
    )
  })

  it.each([
    ['a number', 7],
    ['an empty string', ''],
    ['null', null]
  ])('drops an id that is %s, so the editor gives it one', (_, id) => {
    expect(
      migrate({ version: 1, preset: 'blocks', doc: docOf(withId(id)) }).doc
    ).toEqual(docOf(para('Doors 7pm')))
  })

  it('drops every repeat of an id after the first, nested ones too', () => {
    const stored = docOf(withId('b1', 'Doors 7pm'), {
      type: 'blockquote',
      attrs: { blockId: 'b2' },
      content: [withId('b1', 'All ages')]
    })

    expect(migrate({ version: 1, preset: 'blocks', doc: stored }).doc).toEqual(
      docOf(withId('b1', 'Doors 7pm'), {
        type: 'blockquote',
        attrs: { blockId: 'b2' },
        content: [para('All ages')]
      })
    )
  })

  it('drops ids from a value read into the rich preset', () => {
    expect(
      migrate(
        { version: 1, preset: 'blocks', doc: docOf(withId('b1')) },
        'rich'
      ).doc
    ).toEqual(docOf(para('Doors 7pm')))
  })
})

describe('migrate and an app’s own blocks', () => {
  const card = (attrs?: unknown, extra: object = {}) => ({
    type: 'eventCard',
    ...(attrs !== undefined && { attrs }),
    ...extra
  })
  const blocksOf = (...content: object[]) => ({
    version: 1,
    preset: 'blocks',
    doc: docOf(...content)
  })

  it('keeps a named block with its attrs as stored', () => {
    const attrs = { eventId: 'okw-2026', layout: { columns: 2 }, blockId: 'c1' }

    expect(
      migrate(blocksOf(card(attrs), para('Doors 7pm')), 'blocks', {
        customBlocks: ['eventCard']
      }).doc
    ).toEqual(docOf(card(attrs), para('Doors 7pm')))
  })

  it('drops a block no customBlocks names', () => {
    expect(
      migrate(blocksOf(card({ eventId: 'okw' }), para('Doors'))).doc
    ).toEqual(docOf(para('Doors')))
  })

  it('keeps no content, marks or keys of its own on it', () => {
    expect(
      migrate(
        blocksOf(
          card(
            { eventId: 'okw' },
            {
              content: [para('Sold out')],
              marks: [{ type: 'bold' }],
              text: 'x',
              html: '<script></script>'
            }
          )
        ),
        'blocks',
        { customBlocks: ['eventCard'] }
      ).doc
    ).toEqual(docOf(card({ eventId: 'okw' })))
  })

  it.each([
    ['a list', ['okw']],
    ['a string', 'okw'],
    ['an empty object', {}]
  ])('saves no attrs that are %s', (_, attrs) => {
    expect(
      migrate(blocksOf(card(attrs)), 'blocks', { customBlocks: ['eventCard'] })
        .doc
    ).toEqual(docOf(card()))
  })

  it('drops an id the block can’t keep, and a repeat of one', () => {
    expect(
      migrate(
        blocksOf(
          card({ eventId: 'a', blockId: 7 }),
          card({ eventId: 'b', blockId: 'c1' }),
          card({ eventId: 'c', blockId: 'c1' })
        ),
        'blocks',
        { customBlocks: ['eventCard'] }
      ).doc
    ).toEqual(
      docOf(
        card({ eventId: 'a' }),
        card({ eventId: 'b', blockId: 'c1' }),
        card({ eventId: 'c' })
      )
    )
  })

  it('never lets a name take over one of the preset’s nodes', () => {
    const stored = blocksOf({
      type: 'paragraph',
      attrs: { onclick: 'x' },
      content: [textOf('Doors')]
    })

    expect(
      migrate(stored, 'blocks', { customBlocks: ['paragraph', 'text', 'doc'] })
        .doc
    ).toEqual(docOf(para('Doors')))
  })
})
