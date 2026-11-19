'use client'

import { useSyncExternalStore } from 'react'

import { isDev } from '../../utils/isDev'

export type RegisteredPalette = {
  open: () => void
  shortcut: readonly string[]
}

// The palettes that bind a shortcut, last mounted on top. CommandPalette.Trigger
// and Navigator.Search reach the top one from outside its tree.
let stack: readonly RegisteredPalette[] = []
const listeners = new Set<() => void>()

const notify = () => listeners.forEach((listener) => listener())

export const isCurrentPalette = (palette: RegisteredPalette) =>
  stack.at(-1) === palette

export function registerPalette(palette: RegisteredPalette) {
  if (stack.length > 0 && isDev())
    console.warn(
      '[Roadie] Give one CommandPalette per page a shortcut, and set shortcut={false} on the others. The last one to mount takes the shortcut and the triggers.'
    )
  stack = [...stack, palette]
  notify()
  return () => {
    stack = stack.filter((entry) => entry !== palette)
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
    () => stack.at(-1) ?? null,
    () => null
  )
}
