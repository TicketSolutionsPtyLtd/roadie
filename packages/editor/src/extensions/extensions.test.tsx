// Imports nothing from @tiptap/*: an app's block is built from this subpath
// alone, and `pnpm typecheck` checks this file as that app would.
import { StarIcon } from '@phosphor-icons/react'
import { describe, expectTypeOf, it } from 'vitest'

import {
  type EditorBlock,
  type EditorNodeViewProps,
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

// The behaviour, read-only views and undo keys included, is covered through
// the Editor in EditorCustomBlocks.browser.test.tsx.
describe('@oztix/roadie-editor/extensions', () => {
  it('types an app’s block, built from this subpath alone, as an EditorBlock', () => {
    expectTypeOf({
      node: CallToAction,
      label: 'Call to action',
      icon: StarIcon
    }).toExtend<EditorBlock>()
  })

  it('gives a view its node, updateAttributes, and selected', () => {
    expectTypeOf<EditorNodeViewProps>().toHaveProperty('node')
    expectTypeOf<EditorNodeViewProps>().toHaveProperty('updateAttributes')
    expectTypeOf<EditorNodeViewProps>().toHaveProperty('selected')
  })
})
