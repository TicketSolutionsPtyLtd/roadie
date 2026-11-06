'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

import type { ChainedCommands, Editor as TiptapEditor } from '@tiptap/core'
import { closeHistory, redo, undo } from '@tiptap/pm/history'
import {
  NodeSelection,
  type SelectionBookmark,
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
 * A popover's or drawer's edits, shown in the document as they're made.
 * Escape, a click away or Enter keeps them as one undo step; its close button
 * puts the document back as it opened.
 */
export function useLiveEdit(
  editor: TiptapEditor | null,
  open: boolean,
  onOpenChange: (open: boolean) => void
) {
  const applied = useRef(none())

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

  // The steps this visit has added to the history, and those it has undone,
  // so Undo inside it never reaches past the visit, such as to the block's
  // own insertion.
  const visit = useRef({ steps: 0, undone: 0 })
  useEffect(() => {
    if (open) visit.current = { steps: 0, undone: 0 }
  }, [open])

  const finish = (keep: boolean) => {
    const steps = unapply(!keep)
    if (!editor || !keep || steps.length === 0) return
    const { view } = editor
    // Applied again as one step of its own, which nothing typed next joins.
    const again = view.state.tr
    steps.forEach((step) => again.maybeStep(step))
    view.dispatch(closeHistory(again))
    view.dispatch(closeHistory(view.state.tr))
    visit.current = { steps: visit.current.steps + 1, undone: 0 }
  }

  /**
   * Keeps the edits so far as one step, then makes this edit a step of its
   * own, such as removing an item, which Undo brings back alone.
   */
  const step = (edit: (chain: ChainedCommands) => ChainedCommands) => {
    if (!editor) return
    finish(true)
    edit(
      editor.chain().command(({ tr }) => {
        closeHistory(tr)
        return true
      })
    ).run()
    editor.view.dispatch(closeHistory(editor.state.tr))
    visit.current = { steps: visit.current.steps + 1, undone: 0 }
  }

  /** The editor's Undo, or Redo, within the steps this visit made. */
  const history = (direction: 'undo' | 'redo') => {
    if (!editor) return
    finish(true)
    const { steps, undone } = visit.current
    const { state } = editor
    const dispatch = (tr: Transaction) => editor.view.dispatch(tr)
    if (direction === 'undo' && steps > 0 && undo(state, dispatch)) {
      visit.current = { steps: steps - 1, undone: undone + 1 }
    }
    if (direction === 'redo' && undone > 0 && redo(state, dispatch)) {
      visit.current = { steps: steps + 1, undone: undone - 1 }
    }
  }

  // Closed by the editor rather than the popover.
  const keepOnClose = useEffectEvent(() => finish(true))
  useEffect(() => {
    if (!open) keepOnClose()
  }, [open])

  const handleOpenChange: OpenChange = (next, details) => {
    if (!next) finish(!REVERTING.has(details.reason))
    onOpenChange(next)
  }

  /** Keeps the edits and closes, for a form's Enter or its check. */
  const done = () => {
    finish(true)
    onOpenChange(false)
  }

  return {
    apply,
    step,
    history,
    revert,
    done,
    onOpenChange: handleOpenChange
  }
}

export type LiveEdit = ReturnType<typeof useLiveEdit>
