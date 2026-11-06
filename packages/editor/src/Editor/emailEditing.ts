import {
  type CommandProps,
  type Extensions,
  type JSONContent,
  findParentNode
} from '@tiptap/core'
import { Fragment, type Node as PMNode } from '@tiptap/pm/model'
import { type Selection, TextSelection } from '@tiptap/pm/state'

import { cn } from '@oztix/roadie-core/utils'

import { buttonLook } from '../schema/emailAttrs'
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

const isEmptyTextblock = (node: PMNode | null) =>
  node !== null && node.isTextblock && node.content.size === 0

const isTextLine = (node: PMNode) => node.type.isInGroup('block')

// Puts `block` at `at`, before an emptied line, which keeps it, or with a
// paragraph after it to type in. The caret goes into the block's first line
// when it has one, and a text block's own text is selected.
function placeBlock(
  { tr, dispatch }: Pick<CommandProps, 'tr' | 'dispatch'>,
  at: number,
  block: PMNode,
  emptied: boolean
) {
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

function replaceLine(
  { tr, dispatch }: Pick<CommandProps, 'tr' | 'dispatch'>,
  { from, to }: { from: number; to: number },
  block: PMNode
) {
  const $from = tr.doc.resolve(from)
  const index = $from.index()
  if (!$from.parent.canReplaceWith(index, index + 1, block.type)) return false
  if (dispatch) {
    tr.replaceWith(from, to, block)
    tr.setSelection(TextSelection.create(tr.doc, from + 1))
    tr.scrollIntoView()
  }
  return true
}

/**
 * Inserts `content` before the caret's line when it's empty, which keeps the
 * caret, or when the caret starts it; otherwise after it, with a paragraph to
 * type in.
 */
export function insertBlock(content: JSONContent) {
  return (props: CommandProps) => {
    const { $from } = props.tr.selection
    if (!$from.parent.isTextblock || $from.depth === 0) return false
    const block = props.tr.doc.type.schema.nodeFromJSON(content)
    const emptied = $from.parent.content.size === 0
    const before = emptied || $from.parentOffset === 0
    const at = before ? $from.before() : $from.after()
    return placeBlock(props, at, block, before)
  }
}

/**
 * Inserts `content` after the selection's block, counting only children of
 * `containers`. An empty line takes a text block's place, or has any other
 * block put before it, as `insertBlock` does.
 * Where that container can't hold it, as with a section in a column, it goes
 * after the container's own block.
 */
export function insertBlockAfter(
  content: JSONContent,
  containers: ReadonlySet<string>
) {
  return (props: CommandProps) => {
    const { doc, selection } = props.tr
    const block = doc.type.schema.nodeFromJSON(content)
    const $end = doc.resolve(selection.to)
    const places: { from: number; to: number }[] = []
    // A selected block, a gap cursor or select all ends between children.
    if (containers.has($end.parent.type.name)) {
      places.push({ from: selection.to, to: selection.to })
    }
    for (let depth = $end.depth; depth >= 1; depth--) {
      if (containers.has($end.node(depth - 1).type.name)) {
        places.push({ from: $end.before(depth), to: $end.after(depth) })
      }
    }
    return places.some(({ from, to }, index) => {
      const emptied =
        index === 0 && selection.empty && isEmptyTextblock(doc.nodeAt(from))
      // Only a text line gives way: an empty button is a block of its own.
      if (emptied && block.isTextblock && isTextLine(doc.nodeAt(from)!)) {
        return replaceLine(props, { from, to }, block)
      }
      return placeBlock(props, emptied ? from : to, block, emptied)
    })
  }
}

/** Opens an empty line after the selection's block, unless the caret is on one. */
export function openLineAfter(containers: ReadonlySet<string>) {
  return (props: CommandProps) =>
    (props.tr.selection.empty &&
      isEmptyTextblock(props.tr.selection.$from.parent) &&
      props.tr.selection.$from.parent.type.name === 'paragraph') ||
    insertBlockAfter({ type: 'paragraph' }, containers)(props)
}

const BUTTON_LABEL = 'Button'

export const buttonBlock = (href: string): JSONContent => ({
  type: 'button',
  attrs: { href },
  content: [{ type: 'text', text: BUTTON_LABEL }]
})

/** Leaves a button for a new paragraph after it, rather than splitting it. */
function leaveButton({ tr, dispatch }: CommandProps) {
  if (tr.selection.$from.parent.type.name !== 'button') return false
  if (dispatch) {
    tr.deleteSelection()
    const { $from } = tr.selection
    if ($from.parent.type.name !== 'button') return true
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

// A button keeps its link with no label, so it isn't a line to drop.
const isEmptyLine = (node: PMNode) =>
  node.isTextblock && node.type.name !== 'button' && node.content.size === 0

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

// The saved schema renders bare divs; editor.css outlines them for editing.
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

const BUTTON_ALIGN = { center: 'mx-auto', right: 'ms-auto' } as const

// Matches how renderEmail draws each emphasis, whatever intent the editor sits in.
const BUTTON_EMPHASIS = {
  strong: 'intent-accent emphasis-strong',
  normal: 'intent-neutral emphasis-normal',
  subtle: 'intent-neutral emphasis-subtle'
} as const

function buttonClass(attrs: Attrs) {
  const { align, emphasis = 'strong', fullWidth } = buttonLook(attrs)
  return cn(
    'not-prose rounded-lg px-5 py-2.5 font-semibold',
    BUTTON_EMPHASIS[emphasis],
    fullWidth ? 'w-full text-center' : ['w-fit', align && BUTTON_ALIGN[align]]
  )
}

// Side by side from the width MJML stops stacking columns at.
const EMAIL_EDITING_NODES: Record<string, Extensions[number]> = {
  // Drawn as a div, as Chrome types over a whole link's text outside it.
  button: Button.extend({
    addNodeView:
      () =>
      ({ node }) => {
        const dom = document.createElement('div')
        dom.dataset.type = 'button'
        dom.className = buttonClass(node.attrs)
        return {
          dom,
          contentDOM: dom,
          update: (updated) => {
            if (updated.type !== node.type) return false
            dom.className = buttonClass(updated.attrs)
            return true
          }
        }
      },
    addKeyboardShortcuts: () => ({
      Enter: ({ editor }) => editor.commands.command(leaveButton)
    })
  }),
  // The email's wrapper pads a section 16px above and below.
  section: outlined(Section, 'prose-bleed rounded-lg py-4'),
  // Each column pads its blocks 12px a side, so 24px between them.
  columns: outlined(
    Columns,
    'prose-bleed grid gap-4 @min-[480px]:auto-cols-fr @min-[480px]:grid-flow-col @min-[480px]:gap-6'
  ),
  column: outlined(Column, 'min-w-0 rounded-md'),
  spacer: outlined(Spacer, 'prose-bleed rounded-md', (attrs) => ({
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
