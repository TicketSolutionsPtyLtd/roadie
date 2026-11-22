'use client'

import { type RefObject, useEffect, useEffectEvent, useState } from 'react'

import { fileDropTarget } from '../Sortable/dnd'
import { useFileUploadContext } from './FileUploadContext'

/** Makes an element take files dropped from outside the page, and says while they're over it. */
export function useFileDrop(ref: RefObject<HTMLElement | null>, part: string) {
  const { take, disabled } = useFileUploadContext(part)
  const [dragging, setDragging] = useState(false)
  // Root makes a new take each render; the target shouldn't re-register for it.
  const onDrop = useEffectEvent((files: File[]) => take(files))
  useEffect(() => {
    const element = ref.current
    if (!element || disabled) return
    const cleanup = fileDropTarget({
      element,
      onDragChange: setDragging,
      onDrop
    })
    // Disabled mid-drag: no leave will come, so don't keep the highlight.
    return () => {
      cleanup()
      setDragging(false)
    }
  }, [ref, disabled])
  return dragging && !disabled
}
