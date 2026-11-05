import { type Editor, Extension } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import type { Node, ResolvedPos } from '@tiptap/pm/model'
import {
  AllSelection,
  type EditorState,
  Plugin,
  PluginKey,
  Selection,
  TextSelection,
  type Transaction
} from '@tiptap/pm/state'
import type { Mappable } from '@tiptap/pm/transform'
import type { EditorView } from '@tiptap/pm/view'

import {
  type BlockContainers,
  TOP_LEVEL,
  blockAt,
  duplicateBlock,
  moveBlock,
  parentBlock,
  withoutIds
} from './blockActions'

const holdsBlocks = ($anchor: ResolvedPos, $head: ResolvedPos) =>
  $anchor.parent === $head.parent &&
  !$anchor.parent.inlineContent &&
  $anchor.pos !== $head.pos

/**
 * Whole sibling blocks, from one block's start to another's end, as Escape
 * and Shift+ArrowUp or Shift+ArrowDown choose them. It draws no text
 * selection: the blocks take the focused block's tint instead.
 */
export class BlockSelection extends Selection {
  constructor($anchor: ResolvedPos, $head: ResolvedPos) {
    super($anchor, $head)
  }

  static create(doc: Node, anchor: number, head: number) {
    return new BlockSelection(doc.resolve(anchor), doc.resolve(head))
  }

  map(doc: Node, mapping: Mappable): Selection {
    const $anchor = doc.resolve(mapping.map(this.anchor))
    const $head = doc.resolve(mapping.map(this.head))
    return holdsBlocks($anchor, $head)
      ? new BlockSelection($anchor, $head)
      : TextSelection.between($anchor, $head)
  }

  eq(other: Selection): boolean {
    return (
      other instanceof BlockSelection &&
      other.anchor === this.anchor &&
      other.head === this.head
    )
  }

  toJSON() {
    return { type: 'block', anchor: this.anchor, head: this.head }
  }

  // Undo restores the blocks selected, not their text, as typing would
  // replace it.
  getBookmark() {
    return new BlockBookmark(this.anchor, this.head)
  }

  static fromJSON(doc: Node, json: { anchor: number; head: number }) {
    return BlockSelection.create(doc, json.anchor, json.head)
  }
}

class BlockBookmark {
  constructor(
    readonly anchor: number,
    readonly head: number
  ) {}

  map(mapping: Mappable) {
    return new BlockBookmark(mapping.map(this.anchor), mapping.map(this.head))
  }

  resolve(doc: Node): Selection {
    const $anchor = doc.resolve(this.anchor)
    const $head = doc.resolve(this.head)
    return holdsBlocks($anchor, $head)
      ? new BlockSelection($anchor, $head)
      : TextSelection.between($anchor, $head)
  }
}

BlockSelection.prototype.visible = false
Selection.jsonID('block', BlockSelection)

/** Sibling blocks the selection spans: where the first starts and the last ends. */
export type BlockRange = { from: number; to: number; count: number }

/** The sibling blocks from `from`, a block's start, to `to`, a block's end. */
export function blocksIn(doc: Node, from: number, to: number) {
  const $from = doc.resolve(from)
  const blocks: { node: Node; pos: number }[] = []
  for (let index = $from.index(), pos = from; pos < to; index++) {
    const node = $from.parent.child(index)
    blocks.push({ node, pos })
    pos += node.nodeSize
  }
  return blocks
}

const rangeOf = (doc: Node, from: number, to: number): BlockRange => ({
  from,
  to,
  count: blocksIn(doc, from, to).length
})

/**
 * The blocks the selection spans, lifted to the blocks of one container, or
 * null while it's within one block.
 */
export function selectedBlocks(
  state: EditorState,
  containers: BlockContainers = TOP_LEVEL
): BlockRange | null {
  const { selection, doc } = state
  if (selection instanceof BlockSelection) {
    return rangeOf(doc, selection.from, selection.to)
  }
  const spans =
    selection instanceof TextSelection || selection instanceof AllSelection
  if (!spans || selection.empty) return null
  let first = blockAt(state, selection.from, containers)
  // A selection ending at a block's start doesn't reach into it.
  let last = blockAt(
    state,
    Math.max(selection.from, selection.to - 1),
    containers
  )
  if (first === null || last === null || first === last) return null
  const depth = (pos: number) => doc.resolve(pos).depth
  while (first !== null && last !== null && depth(first) !== depth(last)) {
    if (depth(first) > depth(last))
      first = parentBlock(state, first, containers)
    else last = parentBlock(state, last, containers)
  }
  while (
    first !== null &&
    last !== null &&
    doc.resolve(first).parent !== doc.resolve(last).parent
  ) {
    first = parentBlock(state, first, containers)
    last = parentBlock(state, last, containers)
  }
  if (first === null || last === null) return null
  const range = rangeOf(doc, first, last + doc.nodeAt(last)!.nodeSize)
  return range.count > 1 ? range : null
}

const selectRange = (tr: Transaction, from: number, to: number) =>
  tr.setSelection(BlockSelection.create(tr.doc, from, to)).scrollIntoView()

/** Moves the blocks past the sibling above (-1) or below (1), as one step. */
export function moveRange(state: EditorState, range: BlockRange, step: -1 | 1) {
  const { doc } = state
  const $from = doc.resolve(range.from)
  const $to = doc.resolve(range.to)
  const sibling = step === 1 ? $to.nodeAfter : $from.nodeBefore
  if (!sibling) return null
  const size = range.to - range.from
  if (step === 1) {
    const tr = state.tr
      .delete(range.to, range.to + sibling.nodeSize)
      .insert(range.from, sibling)
    const from = range.from + sibling.nodeSize
    return selectRange(tr, from, from + size)
  }
  const at = range.from - sibling.nodeSize
  const tr = state.tr.insert(range.to, sibling).delete(at, range.from)
  return selectRange(tr, at, at + size)
}

/** Whether the blocks have a sibling to move past, up (-1) or down (1). */
export function canMoveRange(doc: Node, range: BlockRange, step: -1 | 1) {
  return Boolean(
    step === 1
      ? doc.resolve(range.to).nodeAfter
      : doc.resolve(range.from).nodeBefore
  )
}

/** Puts a copy of the blocks after them, with ids of their own, and selects it. */
export function duplicateRange(state: EditorState, range: BlockRange) {
  const copies = blocksIn(state.doc, range.from, range.to).map(({ node }) =>
    withoutIds(node)
  )
  const tr = state.tr.insert(range.to, copies)
  return selectRange(tr, range.to, range.to + (range.to - range.from))
}

/** Removes the blocks, leaving an empty line in a container they empty. */
export function deleteRange(state: EditorState, range: BlockRange) {
  const $from = state.doc.resolve(range.from)
  const emptied = range.count === $from.parent.childCount
  const tr = emptied
    ? state.tr.replaceWith(
        range.from,
        range.to,
        state.schema.nodes.paragraph!.create()
      )
    : state.tr.delete(range.from, range.to)
  const at = Math.min(range.from, tr.doc.content.size)
  return tr
    .setSelection(TextSelection.near(tr.doc.resolve(at)))
    .scrollIntoView()
}

type BlockKeysOptions = { containers: BlockContainers }

// The blocks it holds as indices in their parent, from the anchor's end to
// the head's, with the head one block further up (-1) or down (1).
function extended(selection: BlockSelection, step: -1 | 1) {
  const { $anchor, $head, anchor, head } = selection
  const forward = head > anchor
  const first = forward ? $anchor.index() : $anchor.index() - 1
  const last = (forward ? $head.index() - 1 : $head.index()) + step
  if (last < 0 || last >= $anchor.parent.childCount) return null
  const at = (index: number) => $anchor.posAtIndex(index)
  return last >= first
    ? { anchor: at(first), head: at(last + 1) }
    : { anchor: at(first + 1), head: at(last) }
}

// The end of the last selected block's text, if it has any.
function caretAtEnd(selection: BlockSelection) {
  const { doc } = selection.$from
  const caret = Selection.findFrom(doc.resolve(selection.to), -1, true)
  return caret instanceof TextSelection && caret.from > selection.from
    ? caret
    : null
}

// Whether a range runs out of a section or column, which can't be joined.
function crossesIsolating($from: ResolvedPos, $to: ResolvedPos) {
  if ($from.sameParent($to)) return false
  const shared = $from.sharedDepth($to.pos)
  const isolated = ($pos: ResolvedPos) => {
    for (let depth = $pos.depth; depth > shared; depth--) {
      if ($pos.node(depth).type.spec.isolating) return true
    }
    return false
  }
  return isolated($from) || isolated($to)
}

// The browser's selection, which a fast Shift+Arrow then a key can reach
// before ProseMirror reads it.
function domRange(view: EditorView) {
  const { from, to } = view.state.selection
  const dom = (view.root as Document).getSelection?.()
  if (!dom?.anchorNode || !dom.focusNode) return [from, to] as const
  if (!view.dom.contains(dom.anchorNode) || !view.dom.contains(dom.focusNode)) {
    return [from, to] as const
  }
  try {
    const anchor = view.posAtDOM(dom.anchorNode, dom.anchorOffset)
    const head = view.posAtDOM(dom.focusNode, dom.focusOffset)
    return [Math.min(anchor, head), Math.max(anchor, head)] as const
  } catch {
    return [from, to] as const
  }
}

/**
 * Types over a selection that runs out of a section or column. ProseMirror
 * would fit the text into a new section, with the caret before it, so the
 * selection is deleted first and the text goes where it started.
 */
function replacesAcrossIsolating(
  view: EditorView,
  text: string,
  from = view.state.selection.from,
  to = view.state.selection.to
) {
  const { state } = view
  if (!crossesIsolating(state.doc.resolve(from), state.doc.resolve(to))) {
    return false
  }
  const tr = state.tr.delete(from, to)
  const at = tr.mapping.map(from, -1)
  tr.insertText(text, at)
  tr.setSelection(TextSelection.create(tr.doc, at + text.length))
  view.dispatch(tr.scrollIntoView())
  return true
}

function blockSelectionOf(state: EditorState, containers: BlockContainers) {
  const pos = blockAt(state, state.selection.from, containers)
  if (pos === null) return null
  return BlockSelection.create(
    state.doc,
    pos,
    pos + state.doc.nodeAt(pos)!.nodeSize
  )
}

const onRange =
  (
    containers: BlockContainers,
    onBlocks: (state: EditorState, range: BlockRange) => Transaction | null,
    onBlock: (state: EditorState, pos: number) => Transaction | null
  ) =>
  ({ editor }: { editor: Editor }) => {
    const { state, view } = editor
    const range = selectedBlocks(state, containers)
    const pos = blockAt(state, state.selection.from, containers)
    const tr = range
      ? onBlocks(state, range)
      : pos === null
        ? null
        : onBlock(state, pos)
    // Each its own undo step, even straight after the last.
    if (tr) view.dispatch(closeHistory(tr))
    return range !== null || pos !== null
  }

// Ahead of the keymaps that would split or replace the selected blocks.
const BlockSelectionEnter = Extension.create({
  name: 'blockSelectionEnter',
  priority: 1000,
  addKeyboardShortcuts: () => ({
    // Back to editing the selected blocks, at their end.
    Enter: ({ editor }) => {
      const { selection } = editor.state
      if (!(selection instanceof BlockSelection)) return false
      const caret = caretAtEnd(selection)
      if (!caret) return false
      editor.view.dispatch(editor.state.tr.setSelection(caret).scrollIntoView())
      return true
    }
  })
})

/**
 * Notion's keys: Escape selects the caret's block, Shift+ArrowUp and
 * Shift+ArrowDown grow or shrink a block selection, and the move and
 * duplicate keys act on the selected blocks, or the caret's.
 */
export const BlockKeys = Extension.create<BlockKeysOptions>({
  name: 'blockKeys',
  // After the insert menus' and popovers' own Escape.
  priority: 50,

  addOptions() {
    return { containers: TOP_LEVEL }
  },

  addExtensions() {
    return [BlockSelectionEnter]
  },

  addProseMirrorPlugins() {
    const { containers } = this.options
    return [
      new Plugin({
        key: new PluginKey('blockKeys'),
        props: {
          handleKeyDown(view, event) {
            const { state } = view
            const composing = event.isComposing || event.keyCode === 229
            if (event.defaultPrevented) return false
            const typed =
              event.key.length === 1 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              !composing
            // A collapsed selection replaces nothing.
            if (typed && !view.dom.ownerDocument.getSelection()?.isCollapsed) {
              const [from, to] = domRange(view)
              if (replacesAcrossIsolating(view, event.key, from, to)) {
                return true
              }
            }
            if (event.key !== 'Escape') return false
            if (state.selection instanceof BlockSelection) return false
            const selected = blockSelectionOf(state, containers)
            if (!selected) return false
            // A second Escape, from the selection, closes a dialog around it.
            event.stopPropagation()
            view.dispatch(state.tr.setSelection(selected))
            return true
          },
          handleTextInput(view, from, to, text) {
            const { state } = view
            const { selection } = state
            // Typing on selected blocks carries on at their end, as Notion's.
            if (selection instanceof BlockSelection) {
              const caret = caretAtEnd(selection)
              if (!caret) return false
              const tr = state.tr.setSelection(caret)
              view.dispatch(tr.insertText(text).scrollIntoView())
              return true
            }
            return replacesAcrossIsolating(view, text, from, to)
          }
        }
      })
    ]
  },

  addKeyboardShortcuts() {
    const { containers } = this.options
    const extend =
      (step: -1 | 1) =>
      ({ editor }: { editor: Editor }) => {
        const { selection, doc } = editor.state
        if (!(selection instanceof BlockSelection)) return false
        const next = extended(selection, step)
        if (next) {
          editor.view.dispatch(
            editor.state.tr
              .setSelection(BlockSelection.create(doc, next.anchor, next.head))
              .scrollIntoView()
          )
        }
        return true
      }
    const collapse =
      (toEnd: boolean) =>
      ({ editor }: { editor: Editor }) => {
        const { selection, doc } = editor.state
        if (!(selection instanceof BlockSelection)) return false
        const $pos = doc.resolve(toEnd ? selection.to : selection.from)
        editor.view.dispatch(
          editor.state.tr.setSelection(Selection.near($pos, toEnd ? -1 : 1))
        )
        return true
      }
    return {
      'Shift-ArrowUp': extend(-1),
      'Shift-ArrowDown': extend(1),
      ArrowUp: collapse(false),
      ArrowLeft: collapse(false),
      ArrowDown: collapse(true),
      ArrowRight: collapse(true),
      'Mod-Shift-ArrowUp': onRange(
        containers,
        (state, range) => moveRange(state, range, -1),
        (state, pos) => moveBlock(state, pos, -1, containers)
      ),
      'Mod-Shift-ArrowDown': onRange(
        containers,
        (state, range) => moveRange(state, range, 1),
        (state, pos) => moveBlock(state, pos, 1, containers)
      ),
      'Mod-d': onRange(containers, duplicateRange, duplicateBlock)
    }
  }
})
