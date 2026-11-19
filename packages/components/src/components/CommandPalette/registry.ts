'use client'

import { useSyncExternalStore } from 'react'

import { isDev } from '../../utils/isDev'

export type RegisteredPalette = {
  open: () => void
  shortcut: readonly string[]
}

// The palette that binds the page's shortcut. CommandPalette.Trigger and
// Navigator.Search reach it from outside its tree.
let current: RegisteredPalette | null = null
const listeners = new Set<() => void>()

const notify = () => listeners.forEach((listener) => listener())

export function registerPalette(palette: RegisteredPalette) {
  if (current && isDev())
    console.warn(
      '[Roadie] Give one CommandPalette per page a shortcut, and set shortcut={false} on the others. The last one to mount takes the shortcut and the triggers.'
    )
  current = palette
  notify()
  return () => {
    if (current !== palette) return
    current = null
    notify()
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRegisteredPalette() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  )
}
