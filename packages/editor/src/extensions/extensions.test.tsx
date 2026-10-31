// Imports nothing from @tiptap/*: an app's block is built from this subpath
// alone, and `pnpm typecheck` checks this file as that app would.
import { StarIcon } from '@phosphor-icons/react'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  type EditorBlock,
  type EditorNodeViewProps,
  Extension,
  Mark,
  Node,
  NodeViewWrapper,
  mergeAttributes,
  reactNodeView
} from './index'

function CallToActionView({ node }: EditorNodeViewProps) {
  return <NodeViewWrapper>{String(node.attrs.label)}</NodeViewWrapper>
}

const CallToAction = Node.create({
  name: 'callToAction',
  group: 'block',
  atom: true,
  addAttributes: () => ({
    label: { default: 'Get tickets' },
    href: { default: '' }
  }),
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes)],
  addNodeView: () => reactNodeView(CallToActionView)
})

describe('@oztix/roadie-editor/extensions', () => {
  it('builds an app’s block, ready for the editor’s extensions', () => {
    const block = {
      node: CallToAction,
      label: 'Call to action',
      icon: StarIcon
    } satisfies EditorBlock

    expect(block.node.name).toBe('callToAction')
    expect(block.node.config.atom).toBe(true)
  })

  it('gives a view its node, updateAttributes, and selected', () => {
    expectTypeOf<EditorNodeViewProps>().toHaveProperty('node')
    expectTypeOf<EditorNodeViewProps>().toHaveProperty('updateAttributes')
    expectTypeOf<EditorNodeViewProps>().toHaveProperty('selected')
  })

  it('re-exports Tiptap’s Node, Mark and Extension builders', () => {
    for (const builder of [Node, Mark, Extension]) {
      expect(builder.create({ name: 'x' }).name).toBe('x')
    }
    expect(mergeAttributes({ class: 'a' }, { class: 'b' })).toEqual({
      class: 'a b'
    })
  })
})
