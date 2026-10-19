'use client'

import { type ReactNode, createContext, use, useEffect } from 'react'

type InspectorSlot = {
  setInspector: (content: ReactNode) => void
  /** Closes the drawer the inspector moves into on a narrow screen. */
  closeInspector: () => void
}

export const InspectorSlotContext = createContext<InspectorSlot | null>(null)

/**
 * Puts a page's own content in the inspector column in place of "On this
 * page", for as long as the page is mounted. Memoise `content`: each new
 * value re-renders the frame.
 */
export function useInspector(content: ReactNode) {
  const slot = use(InspectorSlotContext)
  const setInspector = slot?.setInspector
  useEffect(() => {
    setInspector?.(content)
  }, [setInspector, content])
  useEffect(() => () => setInspector?.(null), [setInspector])
  return slot?.closeInspector
}
