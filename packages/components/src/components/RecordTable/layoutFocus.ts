'use client'

import { type RefObject, useLayoutEffect, useRef } from 'react'

import {
  handedOver,
  hiddenByStyle,
  tableFocusTarget
} from '../Records/tableFocus'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Held = { inside: boolean; rowId?: string }

/**
 * Keeps focus with the record across a switch between the table and the
 * list, or in and out of Select mode: the same record's link or first
 * control shown, else the scroller.
 */
export function useLayoutFocus(
  ref: RefObject<HTMLElement | null>,
  layout: string,
  /** Changes when the element may have been replaced, to listen on the new one. */
  placement?: unknown
) {
  const held = useRef<Held>({ inside: false })
  const shown = useRef(layout)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      // A row leaving hands focus to the table; keep the record it held.
      if (handedOver.has(target)) return
      const row = target.closest<HTMLElement>('[data-row-id]')
      held.current = { inside: true, rowId: row?.dataset.rowId }
    }
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null
      if (next && element.contains(next)) return
      if (next) {
        held.current = { inside: false }
        return
      }
      // No next target: focus left the page, or a switch removed the element; only the first sticks.
      const target = event.target as HTMLElement
      queueMicrotask(() => {
        if (target.isConnected && !element.contains(document.activeElement))
          held.current = { inside: false }
      })
    }
    element.addEventListener('focusin', onFocusIn)
    element.addEventListener('focusout', onFocusOut)
    return () => {
      element.removeEventListener('focusin', onFocusIn)
      element.removeEventListener('focusout', onFocusOut)
    }
  }, [ref, placement])

  useLayoutEffect(() => {
    if (shown.current === layout) return
    shown.current = layout
    const element = ref.current
    const { inside, rowId } = held.current
    const active = document.activeElement
    // A row leaving hands its focus to the table, which is still lost to the reader.
    const lost =
      !active ||
      active === document.body ||
      // A re-flowed row's checkbox hides in CSS as Select mode ends, focus and all.
      hiddenByStyle(active) ||
      (rowId !== undefined && active === tableFocusTarget(active))
    if (!element || !inside || !lost) return
    const row = [
      ...element.querySelectorAll<HTMLElement>('[data-row-id]')
    ].find((candidate) => candidate.dataset.rowId === rowId)
    const target =
      row?.querySelector<HTMLElement>('[data-row-link]') ??
      [...(row?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].find(
        (control) => !hiddenByStyle(control)
      ) ??
      element.querySelector<HTMLElement>('[data-slot="record-table-scroller"]')
    target?.focus()
  }, [ref, layout])
}
