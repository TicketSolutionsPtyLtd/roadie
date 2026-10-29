import {
  type CommandProps,
  type Extensions,
  type JSONContent,
  findParentNode
} from '@tiptap/core'
import { Fragment, type Node as PMNode } from '@tiptap/pm/model'
import { type Selection, TextSelection } from '@tiptap/pm/state'

import { Button, Column, Columns, Section, Spacer } from '../schema/emailPreset'

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
 * block's first line when it has one, and a text block's own text is selected.
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
      const head = block.isTextblock ? at + 1 + block.content.size : caret
      const anchor = block.isTextblock ? at + 1 : caret
      tr.setSelection(TextSelection.create(tr.doc, anchor, head))
      tr.scrollIntoView()
    }
    return true
  }
}

const BUTTON_LABEL = 'Button'

export const buttonBlock = (href: string): JSONContent => ({
  type: 'button',
  attrs: { href },
  content: [{ type: 'text', text: BUTTON_LABEL }]
})

/** Leaves a button for a new paragraph after it, rather than splitting it. */
function leaveButton({ tr, dispatch }: CommandProps) {
  const { $from } = tr.selection
  if ($from.parent.type.name !== 'button') return false
  if (dispatch) {
    const after = $from.after()
    tr.insert(after, tr.doc.type.schema.nodes.paragraph!.create())
    tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView()
  }
  return true
}

const isColumns = (node: PMNode) => node.type.name === 'columns'

/** The columns holding the selection. */
export const selectedColumns = ({ selection }: { selection: Selection }) =>
  findParentNode(isColumns)(selection)

const isEmptyLine = (node: PMNode) =>
  node.isTextblock && node.content.size === 0

/**
 * Sets how many columns the selection's columns have. A removed column's
 * blocks move to the end of the last column kept, without its empty lines.
 */
export function setColumnCount(count: number) {
  return ({ tr, dispatch }: CommandProps) => {
    const found = selectedColumns(tr)
    if (!found) return false
    const { node, pos } = found
    if (!dispatch || node.childCount === count) return true
    const end = pos + node.nodeSize - 1
    const { column, paragraph } = tr.doc.type.schema.nodes
    if (count > node.childCount) {
      const added = Array.from({ length: count - node.childCount }, () =>
        column!.create(null, paragraph!.create())
      )
      tr.insert(end, added)
      return true
    }
    const { from } = tr.selection
    let keptEnd = pos + 1
    const moved: PMNode[] = []
    let movedSize = 0
    let caretInMoved: number | undefined
    node.forEach((child, offset, index) => {
      if (index < count) {
        keptEnd += child.nodeSize
        return
      }
      child.forEach((block, blockOffset) => {
        if (isEmptyLine(block)) return
        const start = pos + 2 + offset + blockOffset
        if (from > start && from < start + block.nodeSize) {
          caretInMoved = movedSize + from - start
        }
        moved.push(block)
        movedSize += block.nodeSize
      })
    })
    const inRemoved = from > keptEnd
    tr.delete(keptEnd, end)
    tr.insert(keptEnd - 1, moved)
    if (caretInMoved !== undefined) {
      tr.setSelection(TextSelection.create(tr.doc, keptEnd - 1 + caretInMoved))
    } else if (inRemoved) {
      // The caret's empty line was dropped.
      const bias = moved.length > 0 ? 1 : -1
      tr.setSelection(TextSelection.near(tr.doc.resolve(keptEnd - 1), bias))
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
  // Drawn as a div, as Chrome types over a whole link's text outside it.
  button: Button.extend({
    addNodeView: () => () => {
      const dom = document.createElement('div')
      dom.dataset.type = 'button'
      dom.className =
        'not-prose w-fit rounded-lg emphasis-strong px-5 py-2.5 font-semibold'
      return { dom, contentDOM: dom }
    },
    addKeyboardShortcuts: () => ({
      Enter: ({ editor }) => editor.commands.command(leaveButton)
    })
  }),
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
