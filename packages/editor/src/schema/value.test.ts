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
