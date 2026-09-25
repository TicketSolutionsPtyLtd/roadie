import type { PlotFrame, WidthBand } from './types'

export const MIN_FONT_SIZE = 11
export const DEFAULT_PLOT_HEIGHT = 220
export const INITIAL_WIDTH = 640
export const LEGEND_ROOM = 24

export function widthBand(width: number): WidthBand {
  if (width < 480) return 'narrow'
  return width >= 960 ? 'wide' : 'default'
}

export function plotFrame(
  height: number,
  band: WidthBand,
  yDomain?: readonly [number, number],
  width = INITIAL_WIDTH
): PlotFrame {
  return {
    height,
    width,
    band,
    fontSize: band === 'narrow' ? MIN_FONT_SIZE : 12,
    ...(yDomain && { yDomain })
  }
}

/** Converts `pixels` to x units on a plot `margins` narrower than the frame. */
export function pixelsToX(
  frame: PlotFrame,
  pixels: number,
  [start, end]: readonly [number, number],
  margins: number
) {
  // Margins can outgrow a narrow frame; half the frame keeps the length sane.
  const plotWidth = Math.max(frame.width / 2, frame.width - margins, 1)
  return (pixels / plotWidth) * (end - start)
}
