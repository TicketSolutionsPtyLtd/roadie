'use client'

import {
  type RefObject,
  useEffect,
  useId,
  useState,
  useSyncExternalStore
} from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'

const NOT_TYPEABLE =
  ':not([type=checkbox], [type=radio], [type=button], [type=submit], [type=reset], [type=range], [type=color], [type=file])'

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest(
      `input${NOT_TYPEABLE}, textarea, select, [contenteditable=""], [contenteditable="true"]`
    ) !== null
  )
}

// Fields claiming each key, in mount order: the first one owns it, so a page
// of several fields binds and hints the key once.
const claims = new Map<string, string[]>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Binds a key that focuses the input. True while this field owns it. */
export function useShortcut(
  key: string | undefined,
  inputRef: RefObject<HTMLInputElement | null>
) {
  const id = useId()
  // Before paint, so the owner shows its hint from its first frame.
  useIsomorphicLayoutEffect(() => {
    if (!key) return
    claims.set(key, [...(claims.get(key) ?? []), id])
    notify()
    return () => {
      const left = (claims.get(key) ?? []).filter((claim) => claim !== id)
      if (left.length) claims.set(key, left)
      else claims.delete(key)
      notify()
    }
  }, [key, id])
  const owns = useSyncExternalStore(
    subscribe,
    () => !!key && claims.get(key)?.[0] === id,
    () => !!key
  )
  useEffect(() => {
    if (!key || !owns) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== key || event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [key, owns, inputRef])
  return owns
}

export function useControlledText(
  value: string | undefined,
  defaultValue: string,
  onChange?: (value: string) => void
) {
  const [own, setOwn] = useState(defaultValue)
  const text = value ?? own
  function setText(next: string, { silent = false } = {}) {
    if (next === text) return
    if (value === undefined) setOwn(next)
    if (!silent) onChange?.(next)
  }
  return [text, setText] as const
}
