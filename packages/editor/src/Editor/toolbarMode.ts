'use client'

import {
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import type { EditorToolbarMode } from './variants'

/** Below the small breakpoint, or on a touch screen, the toolbar docks. */
export const PHONE_QUERY = '(width < 40rem), (pointer: coarse)'

/** Whether `query` matches, following it as it changes; `onServer` before hydration. */
export function useMediaQuery(query: string, onServer = false) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => onServer
  )
}

/** Whether the screen is a phone's, by `PHONE_QUERY`. */
export const useOnPhone = () => useMediaQuery(PHONE_QUERY)

type ToolbarModeOptions = {
  toolbar?: EditorToolbarMode
  defaultToolbar?: EditorToolbarMode
  onToolbarChange?: (toolbar: EditorToolbarMode) => void
  pinnable: boolean
}

/** The toolbar the editor shows, which docks on a phone, and a way to pin or unpin it. */
export function useToolbarMode({
  toolbar,
  defaultToolbar = 'docked',
  onToolbarChange,
  pinnable
}: ToolbarModeOptions) {
  const [uncontrolled, setUncontrolled] = useState(defaultToolbar)
  const phone = useOnPhone()
  const chosen = toolbar ?? uncontrolled
  const setToolbar = (next: EditorToolbarMode) => {
    if (toolbar === undefined) setUncontrolled(next)
    onToolbarChange?.(next)
  }
  return {
    toolbar: phone ? ('docked' as const) : chosen,
    // A phone has one toolbar, so there's nothing to pin or unpin.
    pinnable: pinnable && !phone,
    setToolbar
  }
}

const STAYS_PUT = new Set(['visible', 'clip'])

/**
 * The docked bar's `top`: under a pane's sticky header when the pane is what
 * scrolls it, as in the docs, and at the top of any other scroll box.
 */
export function useStickyTop(
  ref: RefObject<HTMLElement | null>,
  /** Changes when the bar mounts again. */
  shown: boolean
) {
  const [top, setTop] = useState<string>()
  useLayoutEffect(() => {
    for (
      let element = ref.current?.parentElement ?? null;
      element;
      element = element.parentElement
    ) {
      const { overflowX, overflowY } = getComputedStyle(element)
      if (STAYS_PUT.has(overflowX) && STAYS_PUT.has(overflowY)) continue
      if (element.dataset.slot === 'pane-viewport')
        setTop('var(--pane-header-height, 0px)')
      return
    }
  }, [ref, shown])
  return top
}

// Popups opened from the bar, which focus moves into while editing goes on.
const BAR_POPUPS = '[role="menu"], [role="listbox"], [role="dialog"]'

/**
 * On a touch screen, whether the docked bar sits above the keyboard, and how
 * far the keyboard pushes it up: it does while focus is in the editor, or in
 * a menu opened from the bar, so the controls stay in thumb reach.
 */
export function useKeyboardDock(
  ref: RefObject<HTMLElement | null>,
  /** The bar that goes `fixed`. */
  barRef: RefObject<HTMLElement | null>,
  /** Changes when the bar mounts again. */
  shown: boolean
) {
  const touch = useMediaQuery('(pointer: coarse)')
  const [editing, setEditing] = useState(false)
  const [shift, setShift] = useState(0)
  const shiftRef = useRef(0)

  useLayoutEffect(() => {
    const frame = ref.current?.closest('[data-slot="editor"]')
    if (!touch || !shown || !frame) return
    let frameId = 0
    // Whether focus was last in this editor, so a popup it opened counts.
    let inside = false
    const follow = () => {
      cancelAnimationFrame(frameId)
      // After focus settles, as a menu's popup takes it a moment later.
      frameId = requestAnimationFrame(() => {
        const active = document.activeElement
        const popup = active?.closest(BAR_POPUPS)
        if (active && frame.contains(active)) inside = true
        // A dialog around the editor is the page, not a popup of its bar.
        else if (!popup || popup.contains(frame)) inside = false
        setEditing(inside)
      })
    }
    follow()
    document.addEventListener('focusin', follow)
    document.addEventListener('focusout', follow)
    return () => {
      cancelAnimationFrame(frameId)
      document.removeEventListener('focusin', follow)
      document.removeEventListener('focusout', follow)
    }
  }, [ref, touch, shown])

  // Measured rather than set as `bottom`: a transformed or contained
  // ancestor, such as a container query's, holds a fixed bar in its own box.
  useLayoutEffect(() => {
    const viewport = window.visualViewport
    if (!touch || !editing || !viewport) return
    const place = () => {
      const bar = barRef.current
      if (!bar) return
      const natural = bar.getBoundingClientRect().bottom - shiftRef.current
      shiftRef.current = viewport.offsetTop + viewport.height - natural
      setShift(shiftRef.current)
    }
    place()
    viewport.addEventListener('resize', place)
    viewport.addEventListener('scroll', place)
    window.addEventListener('scroll', place, { capture: true, passive: true })
    return () => {
      shiftRef.current = 0
      setShift(0)
      viewport.removeEventListener('resize', place)
      viewport.removeEventListener('scroll', place)
      window.removeEventListener('scroll', place, { capture: true })
    }
  }, [barRef, touch, editing])

  return { aboveKeyboard: touch && editing, shift }
}
