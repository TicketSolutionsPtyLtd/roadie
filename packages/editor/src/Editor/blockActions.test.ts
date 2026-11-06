import { getSchema } from '@tiptap/core'
import { describe, expect, it } from 'vitest'

import { type JSONContent, presets } from '../schema'
import { movePlaces } from './blockActions'

const schema = getSchema(presets.email)
const EMAIL = new Set(['doc', 'section', 'column'])

const text = (value: string) => ({ type: 'text', text: value })
const p = (value: string): JSONContent => ({
  type: 'paragraph',
  content: [text(value)]
})
const h = (value: string): JSONContent => ({
  type: 'heading',
  attrs: { level: 2 },
  content: value ? [text(value)] : []
})
const section = (...content: JSONContent[]) => ({ type: 'section', content })
const columns = (...content: JSONContent[][]) => ({
  type: 'columns',
  content: content.map((blocks) => ({ type: 'column', content: blocks }))
})

function placesFor(content: JSONContent[], moving: string) {
  const doc = schema.nodeFromJSON({ type: 'doc', content })
  let from = -1
  doc.descendants((node, pos) => {
    if (from < 0 && node.isTextblock && node.textContent === moving) from = pos
    return from < 0
  })
  return movePlaces(doc, from, EMAIL).map(({ kind, label }) => [kind, label])
}

describe('movePlaces', () => {
  it('offers each heading and section, labelling a section by its first line', () => {
    expect(
      placesFor(
        [
          h('Lineup'),
          p('Doors 7pm'),
          section(h('Getting there'), p('Parking'))
        ],
        'Doors 7pm'
      )
    ).toEqual([
      // Not Lineup, which the block is already under.
      ['section', 'Getting there'],
      ['heading', 'Getting there']
    ])
  })

  it('leaves out a place the block already is, and the block itself', () => {
    expect(placesFor([h('Lineup'), p('Doors 7pm')], 'Doors 7pm')).toEqual([])
    expect(placesFor([h('Lineup'), p('Doors 7pm')], 'Lineup')).toEqual([])
  })

  it('offers no section to a section, which can’t hold one', () => {
    const content = [section(p('Alpha')), section(p('Bravo'))]
    const doc = schema.nodeFromJSON({ type: 'doc', content })
    const second = doc.child(0).nodeSize
    expect(movePlaces(doc, second, EMAIL)).toEqual([])
  })

  it('offers a block in a column the page’s headings and sections', () => {
    expect(
      placesFor(
        [h('Lineup'), section(columns([p('Left')], [p('Right')]))],
        'Left'
      )
    ).toEqual([
      ['heading', 'Lineup'],
      ['section', 'Left']
    ])
  })

  it('names an empty heading', () => {
    expect(placesFor([h(''), p('Doors 7pm'), p('Gates')], 'Gates')).toEqual([
      ['heading', 'Heading']
    ])
  })
})
