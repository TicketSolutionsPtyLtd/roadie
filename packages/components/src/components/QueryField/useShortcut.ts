'use client'

import { type RefObject, useEffect, useState } from 'react'

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

export function useShortcut(
  key: string | undefined,
  inputRef: RefObject<HTMLInputElement | null>
) {
  useEffect(() => {
    if (!key) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== key || event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [key, inputRef])
}

export function useControlledText(
  value: string | undefined,
  defaultValue: string,
  onChange?: (value: string) => void
) {
  const [own, setOwn] = useState(defaultValue)
  const text = value ?? own
  function setText(next: string) {
    if (next === text) return
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }
  return [text, setText] as const
}
