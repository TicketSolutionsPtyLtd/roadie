'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

import type { ChainedCommands, Editor as TiptapEditor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import {
  NodeSelection,
  Selection,
  type SelectionBookmark,
  TextSelection,
  type Transaction
} from '@tiptap/pm/state'
import type { Step } from '@tiptap/pm/transform'

// A popover's, a drawer's or a dialog's, which each say why they closed.
type OpenChange = (open: boolean, details: { reason: string }) => void

const OWN = 'liveEdit'

// A close button puts things back. Escape keeps them, as every other close
// does, and Undo takes them back in one step, as the maintainer decided.
const REVERTING: ReadonlySet<string> = new Set(['close-press'])

type Applied = {
  inverses: Step[]
  selection?: SelectionBookmark
}

const none = (): Applied => ({ inverses: [] })

/**
 * Sets the selected node's attrs in place. updateAttributes replaces a leaf
 * node, which drops the selection the next change needs.
 */
export const setSelectedAttrs =
  (attrs: Record<string, unknown>) => (chain: ChainedCommands) =>
    chain.command(({ tr }) => {
      if (!(tr.selection instanceof NodeSelection)) return false
      for (const [name, value] of Object.entries(attrs)) {
        tr.setNodeAttribute(tr.selection.from, name, value)
      }
      return true
    })

/**
 * Puts the caret after the block, so the next key types rather than
 * replacing the block a tap can't deselect on a phone.
 */
function leaveBlock(editor: TiptapEditor) {
  const { state, view } = editor
  const { selection } = state
  if (!(selection instanceof NodeSelection)) return
  // After it, never in it: text typed in a section would take its rule.
  const from = state.doc.resolve(selection.to)
  // Text only: a block selected next, such as a second section or an image
  // first in this one, would be replaced by the next key all the same.
  const caret =
    Selection.findFrom(from, 1, true) ?? Selection.findFrom(from, -1, true)
  if (!caret) return
  view.dispatch(state.tr.setSelection(caret).setMeta('addToHistory', false))
}

/**
 * Where the caret was before a block was selected, kept in step with edits,
 * and a way back there, or past the block, once its settings close.
 */
function useCaretReturn(editor: TiptapEditor | null) {
  const caretRef = useRef<SelectionBookmark | null>(null)
  useEffect(() => {
    if (!editor) return
    const follow = ({ transaction }: { transaction: Transaction }) => {
      const { selection } = editor.state
      caretRef.current =
        selection instanceof TextSelection
          ? selection.getBookmark()
          : (caretRef.current?.map(transaction.mapping) ?? null)
    }
    editor.on('transaction', follow)
    return () => {
      editor.off('transaction', follow)
    }
  }, [editor])
  return () => {
    if (!editor || editor.isDestroyed) return
    const { state, view } = editor
    if (!(state.selection instanceof NodeSelection)) return
    const caret = caretRef.current?.resolve(state.doc)
    if (caret instanceof TextSelection) {
      view.dispatch(state.tr.setSelection(caret).setMeta('addToHistory', false))
    } else {
      leaveBlock(editor)
    }
  }
}

type LiveEditOptions = {
  /**
   * Leaves a selected block selected as it closes, as when its settings
   * opened from the keyboard. Otherwise the caret goes back to the text, so
   * the next key never replaces the block.
   */
  keepSelected?: boolean
}

/**
 * A popover's or drawer's edits, shown in the document as they're made.
 * Escape, a click away or Enter keeps them as one undo step; its close button
 * puts the document back as it opened.
 */
export function useLiveEdit(
  editor: TiptapEditor | null,
  open: boolean,
  onOpenChange: (open: boolean) => void,
  { keepSelected = false }: LiveEditOptions = {}
) {
  const applied = useRef(none())
  const returnCaret = useCaretReturn(editor)
  const close = () => {
    if (!keepSelected) returnCaret()
    onOpenChange(false)
  }

  // Live edits change marks and attrs, which move no positions, so each
  // inverse maps on its own through a change made elsewhere.
  useEffect(() => {
    if (!editor) return
    const follow = (event: {
      transaction: Transaction
      appendedTransactions: Transaction[]
    }) => {
      const { transaction, appendedTransactions } = event
      if (transaction.getMeta(OWN) === applied) return
      for (const { docChanged, mapping } of [
        transaction,
        ...appendedTransactions
      ]) {
        if (!docChanged) continue
        const { inverses, selection } = applied.current
        applied.current = {
          inverses: inverses.flatMap((step) => step.map(mapping) ?? []),
          selection: selection?.map(mapping)
        }
      }
    }
    editor.on('transaction', follow)
    return () => {
      editor.off('transaction', follow)
    }
  }, [editor])

  // Out of the history while it's open, so undo can't land halfway.
  const apply = (edit: (chain: ChainedCommands) => ChainedCommands) => {
    if (!editor) return
    applied.current.selection ??= editor.state.selection.getBookmark()
    edit(editor.chain().setMeta('addToHistory', false).setMeta(OWN, applied))
      .command(({ tr }) => {
        tr.docs.forEach((before, index) => {
          const step = tr.steps[index]
          if (step) applied.current.inverses.unshift(step.invert(before))
        })
        return true
      })
      .run()
  }

  /** Takes the edits out, returning them. */
  const unapply = (restoreSelection: boolean) => {
    const { inverses, selection } = applied.current
    applied.current = none()
    if (!editor || editor.isDestroyed || inverses.length === 0) return []
    const tr = editor.state.tr.setMeta('addToHistory', false)
    const reverted = inverses
      .map((step) => tr.maybeStep(step))
      .every((result) => !result.failed)
    // Back to the document it opened on, so its selection holds there too.
    if (restoreSelection && reverted && selection) {
      tr.setSelection(selection.resolve(tr.doc))
    }
    editor.view.dispatch(tr)
    return tr.docs
      .flatMap((before, index) => tr.steps[index]?.invert(before) ?? [])
      .reverse()
  }

  /** Puts things back as they opened, leaving it open. */
  const revert = () => {
    unapply(true)
  }

  const finish = (keep: boolean) => {
    const steps = unapply(!keep)
    if (!editor || !keep || steps.length === 0) return
    const { view } = editor
    // Applied again as one step of its own, which nothing typed next joins.
    const redo = view.state.tr
    steps.forEach((step) => redo.maybeStep(step))
    view.dispatch(closeHistory(redo))
    view.dispatch(closeHistory(view.state.tr))
  }

  // Closed by the editor rather than the popover.
  const keepOnClose = useEffectEvent(() => finish(true))
  useEffect(() => {
    if (!open) keepOnClose()
  }, [open])

  const handleOpenChange: OpenChange = (next, details) => {
    if (next) return onOpenChange(true)
    finish(!REVERTING.has(details.reason))
    close()
  }

  /** Keeps the edits and closes, for a form's Enter or its check. */
  const done = () => {
    finish(true)
    close()
  }

  return { apply, revert, done, onOpenChange: handleOpenChange }
}

export type LiveEdit = ReturnType<typeof useLiveEdit>
