'use client'

import { useState, useSyncExternalStore } from 'react'

import type { EditorToolbarMode } from './variants'

/** Below the small breakpoint, or on a touch screen, the toolbar docks. */
export const PHONE_QUERY = '(width < 40rem), (pointer: coarse)'

function subscribeToPhone(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const onPhone = () => window.matchMedia(PHONE_QUERY).matches
const notOnServer = () => false

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
  const phone = useSyncExternalStore(subscribeToPhone, onPhone, notOnServer)
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
