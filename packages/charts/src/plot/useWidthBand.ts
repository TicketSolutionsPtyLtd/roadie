import { type RefObject, useEffect, useState } from 'react'

import { INITIAL_WIDTH, widthBand } from './frame'
import type { WidthBand } from './types'

export function useWidthBand(ref: RefObject<HTMLElement | null>): WidthBand {
  const [band, setBand] = useState<WidthBand>(widthBand(INITIAL_WIDTH))
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBand(widthBand(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return band
}
