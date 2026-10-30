import type { CommandProps, Extensions, JSONContent } from '@tiptap/core'
import { Fragment, type Node as PMNode } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'

import { Column, Columns, Section, Spacer } from '../schema/emailPreset'

function firstTextblockOffset(node: PMNode) {
  let offset: number | undefined
  node.descendants((child, pos) => {
    if (offset !== undefined) return false
    if (child.isTextblock) offset = pos
    return offset === undefined
  })
  return offset
}

/**
 * Inserts `content` before the caret's line when it's empty, which keeps the
 * caret, or after it, with a paragraph to type in. The caret goes into the
 * block's first line when it has one.
 */
export function insertBlock(content: JSONContent) {
  return ({ tr, dispatch }: CommandProps) => {
    const { $from } = tr.selection
    if (!$from.parent.isTextblock || $from.depth === 0) return false
    const block = tr.doc.type.schema.nodeFromJSON(content)
    const emptied = $from.parent.content.size === 0
    const at = emptied ? $from.before() : $from.after()
    const $at = tr.doc.resolve(at)
    const next = $at.parent.maybeChild($at.index())
    const nodes = [block]
    if (!emptied && !next?.isTextblock) {
      nodes.push(tr.doc.type.schema.nodes.paragraph!.create())
    }
    const fragment = Fragment.from(nodes)
    if (!$at.parent.canReplace($at.index(), $at.index(), fragment)) return false
    if (dispatch) {
      tr.insert(at, fragment)
      const inBlock = firstTextblockOffset(block)
      const caret =
        inBlock === undefined ? at + block.nodeSize + 1 : at + 1 + inBlock + 1
      tr.setSelection(TextSelection.create(tr.doc, caret)).scrollIntoView()
    }
    return true
  }
}

type Attrs = Record<string, unknown>

const OUTLINE = 'border border-dashed border-subtle'

// The saved schema renders bare divs; the editor outlines the layout so an
// author can see where each block starts and ends.
function outlined(
  node: typeof Section,
  className: string,
  attrs: (nodeAttrs: Attrs) => Attrs = () => ({})
) {
  return node.extend({
    renderHTML: ({ node: current }) => [
      'div',
      {
        'data-type': current.type.name,
        class: className,
        ...attrs(current.attrs)
      },
      ...(current.isAtom ? [] : [0])
    ]
  })
}

// Side by side from the width MJML stops stacking columns at.
const EMAIL_EDITING_NODES: Record<string, Extensions[number]> = {
  section: outlined(Section, `prose-bleed rounded-lg p-3 ${OUTLINE}`),
  columns: outlined(
    Columns,
    'prose-bleed grid gap-2 @min-[480px]:auto-cols-fr @min-[480px]:grid-flow-col'
  ),
  column: outlined(Column, `min-w-0 rounded-md p-2 ${OUTLINE}`),
  spacer: outlined(Spacer, `prose-bleed rounded-md ${OUTLINE}`, (attrs) => ({
    'data-height': String(attrs.height),
    style: `height: ${Number(attrs.height)}px`
  }))
}

/** The email preset's layout nodes, drawn with their outlines for editing. */
export function withEmailEditing(extensions: Extensions): Extensions {
  return extensions.map((extension) =>
    Object.hasOwn(EMAIL_EDITING_NODES, extension.name)
      ? EMAIL_EDITING_NODES[extension.name]!
      : extension
  )
}
