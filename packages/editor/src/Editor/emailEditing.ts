import {
  type CommandProps,
  type Extensions,
  type JSONContent,
  findParentNode
} from '@tiptap/core'
import { Fragment, type Node as PMNode } from '@tiptap/pm/model'
import { Selection, TextSelection } from '@tiptap/pm/state'

import { cn } from '@oztix/roadie-core/utils'

import { buttonLook } from '../schema/emailAttrs'
import { Button, Column, Columns, Section, Spacer } from '../schema/emailPreset'

function firstTextblock(node: PMNode) {
  let found: { offset: number; size: number } | undefined
  node.descendants((child, pos) => {
    if (found) return false
    if (child.isTextblock) found = { offset: pos, size: child.content.size }
    return !found
  })
  return found
}

const LAYOUT = new Set(['section', 'columns'])

function firstLineOf(block: PMNode, at: number) {
  const line = firstTextblock(block)
  return line && { start: at + 1 + line.offset + 1, size: line.size }
}

const isEmptyTextblock = (node: PMNode | null) =>
  node !== null && node.isTextblock && node.content.size === 0

const isTextLine = (node: PMNode) => node.type.isInGroup('block')

// Puts `block` at `at`, in place of the emptied line there, so no empty line
// is left. A paragraph to type in follows, unless a text block does already
// or the block is a section or columns, which Enter and Tab leave. The
// block's first line, or the block itself when it's a text block, has its
// text selected, so typing replaces a ready-made section's placeholder.
function placeBlock(
  { tr, dispatch }: Pick<CommandProps, 'tr' | 'dispatch'>,
  at: number,
  block: PMNode,
  emptied: boolean
) {
  const $at = tr.doc.resolve(at)
  const index = $at.index()
  const end = emptied ? index + 1 : index
  const next = $at.parent.maybeChild(end)
  const nodes = [block]
  if (!LAYOUT.has(block.type.name) && !next?.isTextblock) {
    nodes.push(tr.doc.type.schema.nodes.paragraph!.create())
  }
  const fragment = Fragment.from(nodes)
  if (!$at.parent.canReplace(index, end, fragment)) return false
  if (dispatch) {
    const to = emptied ? at + $at.parent.child(index).nodeSize : at
    tr.replaceWith(at, to, fragment)
    const line = block.isTextblock
      ? { start: at + 1, size: block.content.size }
      : firstLineOf(block, at)
    tr.setSelection(
      line
        ? TextSelection.create(tr.doc, line.start, line.start + line.size)
        : TextSelection.create(tr.doc, at + block.nodeSize + 1)
    )
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
 * Inserts `content` in place of the caret's line when it's empty, before it
 * when the caret starts it, and otherwise after it.
 */
export function insertBlock(content: JSONContent) {
  return (props: CommandProps) => {
    const { $from } = props.tr.selection
    if (!$from.parent.isTextblock || $from.depth === 0) return false
    const block = props.tr.doc.type.schema.nodeFromJSON(content)
    const emptied = $from.parent.content.size === 0
    const before = emptied || $from.parentOffset === 0
    const at = before ? $from.before() : $from.after()
    return placeBlock(props, at, block, emptied)
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
      const givesWay = emptied && isTextLine(doc.nodeAt(from)!)
      if (givesWay && block.isTextblock) {
        return replaceLine(props, { from, to }, block)
      }
      return placeBlock(props, emptied ? from : to, block, givesWay)
    })
  }
}

// An emptied line goes with the query in a section or column, which would
// otherwise keep it, as the new section lands after the whole block.
export function dropEmptiedLine({ tr }: CommandProps) {
  const { $from, empty } = tr.selection
  const holder = $from.node(-1)
  const emptied =
    empty && $from.parent.isTextblock && !$from.parent.content.size
  if (
    emptied &&
    $from.depth > 1 &&
    holder.childCount > 1 &&
    (holder.type.name === 'section' || holder.type.name === 'column')
  ) {
    const before = $from.before()
    tr.delete(before, $from.after())
    // Back into the same block: the next one is nearer forwards from its end.
    tr.setSelection(Selection.near(tr.doc.resolve(before), -1))
  }
  return true
}

/**
 * Inserts `content` at the caret as `insertBlock` does, or, where its section
 * or columns can't hold it, after that top-level block.
 */
export function insertBlockHereOrAfter(content: JSONContent) {
  return (props: CommandProps) =>
    insertBlock(content)(props) ||
    (dropEmptiedLine(props) &&
      insertBlockAfter(content, new Set(['doc']))(props))
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

/**
 * Takes the empty last line of a section out after it, as Enter on an empty
 * list item leaves the list, so what's typed next isn't in the section.
 */
function leaveSection({ tr, dispatch }: CommandProps) {
  const { $from, empty } = tr.selection
  if (!empty || $from.depth < 2) return false
  const section = $from.node(-1)
  const lastLine = $from.index(-1) === section.childCount - 1
  if (
    section.type.name !== 'section' ||
    section.childCount < 2 ||
    !lastLine ||
    $from.parent.type.name !== 'paragraph' ||
    $from.parent.content.size > 0
  ) {
    return false
  }
  if (dispatch) {
    const after = $from.after(-1)
    tr.delete($from.before(), $from.after())
    const at = tr.mapping.map(after)
    tr.insert(at, tr.doc.type.schema.nodes.paragraph!.create())
    tr.setSelection(TextSelection.create(tr.doc, at + 1)).scrollIntoView()
  }
  return true
}

/** Leaves a button for a new paragraph after it, rather than splitting it. */
function leaveButton({ tr, dispatch }: CommandProps) {
  if (tr.selection.$from.parent.type.name !== 'button') return false
  if (dispatch) {
    tr.deleteSelection()
    const { $from } = tr.selection
    if ($from.parent.type.name !== 'button') return true
    const after = $from.after()
    // Into an empty line already there, so a second Enter can leave a section.
    const next = tr.doc.nodeAt(after)
    const emptyLine = next?.type.name === 'paragraph' && next.content.size === 0
    if (!emptyLine) {
      tr.insert(after, tr.doc.type.schema.nodes.paragraph!.create())
    }
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

/**
 * Moves the caret to the start of the next column, or the end of the one
 * before, as Tab moves between a table's cells. Past the row's ends it goes
 * to the line after or before the row, and Tab opens one after a row that
 * ends its container. A list item that can indent keeps Tab.
 */
function goToColumn(dir: 1 | -1) {
  return ({ tr, dispatch, can }: CommandProps) => {
    const { $from } = tr.selection
    let depth = $from.depth
    while (depth > 0 && $from.node(depth).type.name !== 'column') depth--
    if (depth === 0) return false
    if (dir === 1 && can().sinkListItem('listItem')) return false
    if (dir === -1 && can().liftListItem('listItem')) return false
    const row = $from.node(depth - 1)
    const target = $from.index(depth - 1) + dir
    let from: number
    if (target < 0 || target >= row.childCount) {
      from = dir === 1 ? $from.after(depth - 1) : $from.before(depth - 1)
    } else {
      from = $from.start(depth - 1)
      for (let index = 0; index < target; index++) {
        from += row.child(index).nodeSize
      }
      if (dir === -1) from += row.child(target).nodeSize
    }
    const $past = tr.doc.resolve(from)
    const last =
      dir === 1 && from === $from.after(depth - 1) && !$past.nodeAfter
    if (last) {
      if (dispatch) {
        tr.insert(from, tr.doc.type.schema.nodes.paragraph!.create())
        tr.setSelection(TextSelection.create(tr.doc, from + 1))
        dispatch(tr.scrollIntoView())
      }
      return true
    }
    const found = Selection.findFrom($past, dir, true)
    if (!found) return false
    dispatch?.(tr.setSelection(found).scrollIntoView())
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
  section: outlined(Section, 'prose-bleed rounded-lg py-4').extend({
    addKeyboardShortcuts: () => ({
      Enter: ({ editor }) => editor.commands.command(leaveSection)
    })
  }),
  // Each column pads its blocks 12px a side, so 24px between them.
  columns: outlined(
    Columns,
    'prose-bleed grid gap-4 @min-[480px]:auto-cols-fr @min-[480px]:grid-flow-col @min-[480px]:gap-6'
  ),
  column: outlined(Column, 'min-w-0 rounded-md').extend({
    addKeyboardShortcuts: () => ({
      Tab: ({ editor }) => editor.commands.command(goToColumn(1)),
      'Shift-Tab': ({ editor }) => editor.commands.command(goToColumn(-1))
    })
  }),
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
