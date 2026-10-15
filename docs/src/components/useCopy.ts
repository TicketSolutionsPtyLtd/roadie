'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// The Clipboard API only exists in a secure context, so a preview opened over
// plain HTTP on a network name falls back to the older selection copy.
function copyWithSelection(text: string) {
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    field.remove()
  }
}

async function writeText(text: string) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('No Clipboard API')
    await navigator.clipboard.writeText(text)
  } catch {
    if (!copyWithSelection(text)) throw new Error("Couldn't copy")
  }
}

async function writePending(text: Promise<string>) {
  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      // Safari drops the click's permission across an await, so text that is
      // still loading goes to the clipboard as a pending item.
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': text.then(
            (value) => new Blob([value], { type: 'text/plain' })
          )
        })
      ])
      return
    } catch {
      // Falls through to the plain text paths below.
    }
  }
  await writeText(await text)
}

/**
 * Copies text to the clipboard; `copied` stays true for two seconds after,
 * and `failed` for as long when every way to copy is refused. `copy`
 * resolves to whether it worked.
 */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(async (text: string | Promise<string>) => {
    clearTimeout(timer.current)
    let ok = true
    try {
      await (typeof text === 'string' ? writeText(text) : writePending(text))
    } catch {
      ok = false
    }
    setCopied(ok)
    setFailed(!ok)
    timer.current = setTimeout(() => {
      setCopied(false)
      setFailed(false)
    }, 2000)
    return ok
  }, [])

  return { copied, failed, copy }
}
