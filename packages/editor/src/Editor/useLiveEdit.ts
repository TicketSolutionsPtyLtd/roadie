'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

import type { ChainedCommands, Editor as TiptapEditor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import type { Step } from '@tiptap/pm/transform'

import type { PopoverProps } from '@oztix/roadie-components/popover'

type OpenChange = NonNullable<PopoverProps['onOpenChange']>

// Escape and a close button put things back; any other close keeps them.
const REVERTING: ReadonlySet<string> = new Set(['escape-key', 'close-press'])

type Applied = { steps: Step[]; inverses: Step[] }

const none = (): Applied => ({ steps: [], inverses: [] })

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
    const { steps, inverses } = applied.current
    applied.current = none()
    if (!editor || editor.isDestroyed || steps.length === 0) return
    const { view } = editor
    const revert = view.state.tr.setMeta('addToHistory', false)
    inverses.forEach((step) => revert.maybeStep(step))
    view.dispatch(revert)
    if (!keep) return
    // Applied again as one step of its own, which nothing typed next joins.
    const redo = view.state.tr
    steps.forEach((step) => redo.maybeStep(step))
    view.dispatch(closeHistory(redo))
    view.dispatch(closeHistory(view.state.tr))
  }

  // Closed by the editor, or by a form's own Done, rather than the popover.
  const keepOnClose = useEffectEvent(() => finish(true))
  useEffect(() => {
    if (!open) keepOnClose()
  }, [open])

  const handleOpenChange: OpenChange = (next, details) => {
    if (!next) finish(!REVERTING.has(details.reason))
    onOpenChange(next)
  }

  return { apply, onOpenChange: handleOpenChange }
}

export type LiveEdit = ReturnType<typeof useLiveEdit>
