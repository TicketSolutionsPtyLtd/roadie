import { getExtensionField, getSchema } from '@tiptap/core'
import { type ContentMatch, Node, type NodeType } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'

import { type JSONContent, type Preset, presets } from './index'
import { presetShapes } from './presetShapes'

const schema = getSchema(presets.basic)

const eventDescription: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Doors open 7pm.' },
        { type: 'hardBreak' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'All ages.' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'underline' }], text: 'No refunds.' },
        { type: 'text', text: ' ' },
        {
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: { href: 'https://www.oztix.com.au/ochre-kite-weekender' }
            }
          ],
          text: 'Tickets'
        }
      ]
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Bar' }] }
          ]
        }
      ]
    },
    {
      type: 'orderedList',
      attrs: { start: 1, type: null },
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Support act' }]
            }
          ]
        }
      ]
    }
  ]
}

function parse(doc: JSONContent) {
  const node = Node.fromJSON(schema, doc)
  node.check()
  return node
}

describe('presets.basic', () => {
  it('names its nodes and marks as Tiptap does', () => {
    expect(Object.keys(schema.nodes).sort()).toEqual([
      'bulletList',
      'doc',
      'hardBreak',
      'listItem',
      'orderedList',
      'paragraph',
      'text'
    ])
    expect(Object.keys(schema.marks).sort()).toEqual([
      'bold',
      'italic',
      'link',
      'underline'
    ])
  })

  it('saves only the href of a link', () => {
    expect(Object.keys(schema.marks.link!.spec.attrs ?? {})).toEqual(['href'])
  })

  it('saves an underline with no attrs', () => {
    expect(schema.marks.underline!.spec.attrs ?? {}).toEqual({})
  })

  it('reads an event description saved in the basic marks, links and lists', () => {
    expect(parse(eventDescription).toJSON()).toEqual(eventDescription)
  })

  it.each([
    ['a heading', { type: 'heading', attrs: { level: 2 } }],
    ['a table', { type: 'table', content: [] }],
    ['a raw HTML node', { type: 'html', attrs: { html: '<script></script>' } }]
  ])('rejects %s', (_, node) => {
    expect(() => parse({ type: 'doc', content: [node] })).toThrow(
      /Unknown node/
    )
  })

  it('rejects a mark outside the preset', () => {
    expect(() =>
      parse({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', marks: [{ type: 'strike' }], text: 'x' }]
          }
        ]
      })
    ).toThrow(/no mark type strike/i)
  })
})

const rich = getSchema(presets.rich)

describe('presets.rich', () => {
  it('names its nodes and marks as Tiptap does', () => {
    expect(Object.keys(rich.nodes).sort()).toEqual([
      'blockquote',
      'bulletList',
      'doc',
      'embed',
      'hardBreak',
      'heading',
      'horizontalRule',
      'image',
      'listItem',
      'orderedList',
      'paragraph',
      'table',
      'tableCell',
      'tableHeader',
      'tableRow',
      'text'
    ])
    expect(Object.keys(rich.marks).sort()).toEqual([
      'bold',
      'italic',
      'link',
      'underline'
    ])
  })

  it('saves only the level of a heading', () => {
    expect(Object.keys(rich.nodes.heading!.spec.attrs ?? {})).toEqual(['level'])
  })

  it('saves an embed as its provider, id and params, never a src, as a block', () => {
    const embed = rich.nodes.embed!

    expect(Object.keys(embed.spec.attrs ?? {})).toEqual([
      'provider',
      'id',
      'params'
    ])
    expect(embed.isBlock && embed.isAtom).toBe(true)
  })

  it('saves only the src and alt text of an image, as a block', () => {
    const image = rich.nodes.image!

    expect(Object.keys(image.spec.attrs ?? {})).toEqual(['src', 'alt'])
    expect(image.isBlock && image.isAtom).toBe(true)
  })

  it.each([['tableCell'], ['tableHeader']])(
    'saves only the colspan and rowspan of a %s, never a colwidth',
    (name) => {
      expect(Object.keys(rich.nodes[name]!.spec.attrs ?? {})).toEqual([
        'colspan',
        'rowspan'
      ])
    }
  )

  // A pasted cell holding text, as ProseMirror's DOMParser meets it.
  const cellWithSpans = (colspan: string, rowspan: string) => ({
    children: [{}],
    textContent: '9pm',
    getAttribute: (name: string) => ({ colspan, rowspan })[name] ?? null
  })

  function pastedAttrs(name: string, element: object) {
    for (const rule of rich.nodes[name]!.spec.parseDOM ?? []) {
      const attrs = rule.getAttrs?.(element as HTMLElement) ?? {}
      if (attrs !== false) return attrs
    }
    return false
  }

  it.each(
    [
      ['2', 2],
      ['1000', 1000],
      ['0', 1],
      ['-1', 1],
      ['1.5', 1],
      ['two', 1],
      ['1001', 1],
      ['1000000000', 1]
    ].flatMap(([colspan, read]) =>
      ['tableCell', 'tableHeader'].map(
        (name) => [name, String(colspan), Number(read)] as const
      )
    )
  )('reads a pasted %s colspan of "%s" as %d', (name, colspan, read) => {
    expect(pastedAttrs(name, cellWithSpans(colspan, '1'))).toEqual({
      colspan: read,
      rowspan: 1
    })
  })

  it.each([
    ['3', 3],
    ['65534', 65534],
    ['0', 1],
    ['65535', 1],
    ['1000000000', 1]
  ])('reads a pasted rowspan of "%s" as %d', (rowspan, read) => {
    expect(pastedAttrs('tableCell', cellWithSpans('1', rowspan))).toEqual({
      colspan: 1,
      rowspan: read
    })
  })

  it.each([['tableCell'], ['tableHeader']])(
    'holds only paragraphs in a %s',
    (name) => {
      expect(rich.nodes[name]!.spec.content).toBe('paragraph+')
    }
  )

  it('rejects a list inside a table cell', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'bulletList',
                      content: [
                        {
                          type: 'listItem',
                          content: [{ type: 'paragraph' }]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }

    expect(() => Node.fromJSON(rich, doc).check()).toThrow(/Invalid content/)
  })

  const tableNodes = ['table', 'tableRow', 'tableHeader', 'tableCell']

  it.each(tableNodes)(
    'saves a %s with no editing plugins, commands or shortcuts',
    (name) => {
      const extension = presets.rich.find((each) => each.name === name)!

      for (const field of [
        'addProseMirrorPlugins',
        'addCommands',
        'addKeyboardShortcuts',
        'addNodeView'
      ] as const) {
        expect(getExtensionField(extension, field)).toBeUndefined()
      }
    }
  )

  it('gives each table node the role prosemirror-tables reads, isolating cells', () => {
    expect(
      tableNodes.map((name) => [
        rich.nodes[name]!.spec.tableRole,
        rich.nodes[name]!.spec.isolating
      ])
    ).toEqual([
      ['table', true],
      ['row', undefined],
      ['header_cell', true],
      ['cell', true]
    ])
  })

  it.each([
    ['table', 'table'],
    ['tableRow', 'tr'],
    ['tableHeader', 'th'],
    ['tableCell', 'td']
  ])('reads a pasted %s from a <%s>', (name, tag) => {
    expect(rich.nodes[name]!.spec.parseDOM?.map((rule) => rule.tag)).toEqual([
      tag
    ])
  })

  it('reads an event description with headings, a quote and a divider', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Lineup' }]
        },
        ...eventDescription.content!,
        { type: 'horizontalRule' },
        {
          type: 'image',
          attrs: { src: '/images/crowd.webp', alt: 'The crowd at sunset' }
        },
        {
          type: 'embed',
          attrs: {
            provider: 'spotify',
            id: 'exampleTrack0000000001',
            params: { type: 'track' }
          }
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Best weekend of the year.' }]
            }
          ]
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  attrs: { colspan: 2, rowspan: 1 },
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Set times' }]
                    }
                  ]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', marks: [{ type: 'bold' }], text: '7pm' }
                      ]
                    }
                  ]
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Doors' }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
    const node = Node.fromJSON(rich, doc)
    node.check()

    expect(node.toJSON()).toEqual(doc)
  })
})

const contentKinds: Record<string, string> = {
  'listItem+': 'listItems',
  'column{2,4}': 'columns',
  'paragraph block*': 'paragraphFirst',
  'tableRow+': 'tableRows',
  '(tableCell | tableHeader)*': 'tableCells',
  'paragraph+': 'paragraphs'
}

describe('presetShapes', () => {
  it.each(Object.keys(presets) as Preset[])(
    'matches the %s preset’s schema',
    (preset) => {
      const { nodes, marks } = getSchema(presets[preset])
      const attrsOf = (spec: { attrs?: object }) =>
        Object.keys(spec.attrs ?? {})
      const shapes = Object.fromEntries(
        Object.values(nodes).map((type) => [
          type.name,
          {
            ...(type.isInline && { inline: true }),
            content: type.isLeaf
              ? 'none'
              : type.inlineContent
                ? 'inline'
                : (contentKinds[type.spec.content ?? ''] ?? 'blocks'),
            ...(attrsOf(type.spec).length > 0 && { attrs: attrsOf(type.spec) }),
            ...(type.spec.marks === '' &&
              type.spec.content === 'text*' && { plainText: true })
          }
        ])
      )
      const markAttrs = Object.fromEntries(
        Object.values(marks).map((type) => [type.name, attrsOf(type.spec)])
      )

      const withoutHolds = Object.fromEntries(
        Object.entries(presetShapes[preset].nodes).map(
          ([name, { holds: _holds, ...shape }]) => [name, shape]
        )
      )

      expect(withoutHolds).toEqual(shapes)
      expect(presetShapes[preset].marks).toEqual(markAttrs)
    }
  )
})

// Every block a node can hold, read from its content expression.
function heldBy(type: NodeType) {
  const held = new Set<string>()
  const seen = new Set<ContentMatch>()
  const visit = (match: ContentMatch) => {
    if (seen.has(match)) return
    seen.add(match)
    for (let index = 0; index < match.edgeCount; index++) {
      const { type: child, next } = match.edge(index)
      if (!child.isInline) held.add(child.name)
      visit(next)
    }
  }
  visit(type.contentMatch)
  return [...held].sort()
}

const NEVER_HELD_BY_DEFAULT = new Set([
  'doc',
  'listItem',
  'tableRow',
  'tableHeader',
  'tableCell',
  'column'
])

describe('presetShapes holds', () => {
  it.each(Object.keys(presets) as Preset[])(
    'lists the blocks each node of the %s preset holds',
    (preset) => {
      const { nodes } = getSchema(presets[preset])
      const blocks = Object.values(nodes)
        .filter(
          (type) => !type.isInline && !NEVER_HELD_BY_DEFAULT.has(type.name)
        )
        .map((type) => type.name)

      for (const [name, shape] of Object.entries(presetShapes[preset].nodes)) {
        if (shape.content !== 'blocks' && shape.content !== 'paragraphFirst') {
          continue
        }
        const holds: readonly string[] = 'holds' in shape ? shape.holds : blocks

        expect([...holds].sort(), name).toEqual(heldBy(nodes[name]!))
      }
    }
  )
})
