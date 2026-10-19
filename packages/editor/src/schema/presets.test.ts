import { getSchema } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
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
        }
      ]
    }
    const node = Node.fromJSON(rich, doc)
    node.check()

    expect(node.toJSON()).toEqual(doc)
  })
})

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
                : type.spec.content === 'listItem+'
                  ? 'listItems'
                  : type.spec.content === 'paragraph block*'
                    ? 'paragraphFirst'
                    : 'blocks',
            ...(attrsOf(type.spec).length > 0 && { attrs: attrsOf(type.spec) })
          }
        ])
      )
      const markAttrs = Object.fromEntries(
        Object.values(marks).map((type) => [type.name, attrsOf(type.spec)])
      )

      expect(presetShapes[preset].nodes).toEqual(shapes)
      expect(presetShapes[preset].marks).toEqual(markAttrs)
    }
  )
})
