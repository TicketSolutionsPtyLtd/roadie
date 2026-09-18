'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Copies text to the clipboard; `copied` stays true for two seconds after. */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }, [])

  return { copied, copy }
}
