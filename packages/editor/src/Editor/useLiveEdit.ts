'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

import type { ChainedCommands, Editor as TiptapEditor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import { NodeSelection, type SelectionBookmark } from '@tiptap/pm/state'
import type { Step } from '@tiptap/pm/transform'

import type { PopoverProps } from '@oztix/roadie-components/popover'

type OpenChange = NonNullable<PopoverProps['onOpenChange']>

// Escape and a close button put things back; any other close keeps them.
const REVERTING: ReadonlySet<string> = new Set(['escape-key', 'close-press'])

type Applied = {
  steps: Step[]
  inverses: Step[]
  selection?: SelectionBookmark
}

const none = (): Applied => ({ steps: [], inverses: [] })

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
 * A popover's edits, shown in the document as they're made. Escape or its
 * close button puts the document back as it opened; any other close keeps
 * them as one undo step.
 */
export function useLiveEdit(
  editor: TiptapEditor | null,
  open: boolean,
  onOpenChange: (open: boolean) => void
) {
  const applied = useRef(none())

  // Out of the history while it's open, so undo can't land halfway.
  const apply = (edit: (chain: ChainedCommands) => ChainedCommands) => {
    if (!editor) return
    applied.current.selection ??= editor.state.selection.getBookmark()
    edit(editor.chain().setMeta('addToHistory', false))
      .command(({ tr }) => {
        tr.docs.forEach((before, index) => {
          const step = tr.steps[index]
          if (!step) return
          applied.current.steps.push(step)
          applied.current.inverses.unshift(step.invert(before))
        })
        return true
      })
      .run()
  }

  const finish = (keep: boolean) => {
    const { steps, inverses, selection } = applied.current
    applied.current = none()
    if (!editor || editor.isDestroyed || steps.length === 0) return
    const { view } = editor
    const revert = view.state.tr.setMeta('addToHistory', false)
    const reverted = inverses
      .map((step) => revert.maybeStep(step))
      .every((result) => !result.failed)
    // Back to the document it opened on, so its selection holds there too.
    if (!keep && reverted && selection) {
      revert.setSelection(selection.resolve(revert.doc))
    }
    view.dispatch(revert)
    if (!keep) return
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

  return { apply, done, onOpenChange: handleOpenChange }
}

export type LiveEdit = ReturnType<typeof useLiveEdit>
