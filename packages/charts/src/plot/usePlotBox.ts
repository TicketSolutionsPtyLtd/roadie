import { type RefObject, useEffect, useState } from 'react'

import { INITIAL_WIDTH, widthBand } from './frame'
import type { WidthBand } from './types'

export type PlotBox = { band: WidthBand; height: number | null }

/** Reads the box CSS gave the plot, for the width band and label spacing. */
export function usePlotBox(ref: RefObject<HTMLElement | null>): PlotBox {
  const [box, setBox] = useState<PlotBox>({
    band: widthBand(INITIAL_WIDTH),
    height: null
  })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const band = widthBand(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height) || null
      setBox((last) =>
        last.band === band && last.height === height ? last : { band, height }
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return box
}
