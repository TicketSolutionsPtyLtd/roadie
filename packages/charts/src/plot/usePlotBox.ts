import { type RefObject, useEffect, useState } from 'react'

import { INITIAL_WIDTH, widthBand } from './frame'
import type { WidthBand } from './types'

export type PlotBox = {
  band: WidthBand
  width: number
  height: number | null
  measured: boolean
}

// Steps keep a resize drag from rebuilding the definition on every pixel.
const STEP = 10
const stepped = (size: number) => Math.round(size / STEP) * STEP

/** Reads the box CSS gave the plot, for the width band and pixel-sized marks. */
export function usePlotBox(ref: RefObject<HTMLElement | null>): PlotBox {
  const [box, setBox] = useState<PlotBox>({
    band: widthBand(INITIAL_WIDTH),
    width: INITIAL_WIDTH,
    height: null,
    measured: false
  })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width: measuredWidth, height: measuredHeight } = entry.contentRect
      const band = widthBand(measuredWidth)
      const width = stepped(measuredWidth) || INITIAL_WIDTH
      const height = stepped(measuredHeight) || null
      setBox((last) =>
        last.measured &&
        last.band === band &&
        last.width === width &&
        last.height === height
          ? last
          : { band, width, height, measured: true }
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return box
}
