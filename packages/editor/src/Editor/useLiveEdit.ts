'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

import type { ChainedCommands, Editor as TiptapEditor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import {
  NodeSelection,
  type SelectionBookmark,
  type Transaction
} from '@tiptap/pm/state'
import type { Step } from '@tiptap/pm/transform'

// A popover's, a drawer's or a dialog's, which each say why they closed.
type OpenChange = (open: boolean, details: { reason: string }) => void

const OWN = 'liveEdit'

// Escape and a close button put things back; any other close keeps them.
const REVERTING: ReadonlySet<string> = new Set(['escape-key', 'close-press'])

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
 * A popover's or drawer's edits, shown in the document as they're made. Escape or its
 * close button puts the document back as it opened; any other close keeps
 * them as one undo step.
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
    if (!next) finish(!REVERTING.has(details.reason))
    onOpenChange(next)
  }

  /** Keeps the edits and closes, for a form's Enter or its check. */
  const done = () => {
    finish(true)
    onOpenChange(false)
  }

  return { apply, revert, done, onOpenChange: handleOpenChange }
}

export type LiveEdit = ReturnType<typeof useLiveEdit>
