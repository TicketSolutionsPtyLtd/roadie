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

/** An SVG's horizontal pixels, with the plotting area inside its margins. */
export type PlotSpan = { width: number; left: number; right: number }

/** The pixel `fraction` of the way across the plotting area, from the SVG's left edge. */
export const spanPixel = ({ width, left, right }: PlotSpan, fraction: number) =>
  left + fraction * Math.max(width - left - right, 1)

// Width estimates run a pixel or two short of some engines' glyph boxes.
const EDGE_INSET = 4

/** The dx that slides a centred label at `x` just far enough to stay inside the SVG. */
export function centredShift(x: number, labelWidth: number, svgWidth: number) {
  const half = labelWidth / 2 + EDGE_INSET
  return Math.max(half, Math.min(x, svgWidth - half)) - x
}

/** A label `gap` px beside `x` reads to the right, or flips left rather than leave the SVG. */
export function besideAnchor(
  x: number,
  gap: number,
  labelWidth: number,
  svgWidth: number
): 'start' | 'end' {
  return x + gap + labelWidth + EDGE_INSET <= svgWidth ? 'start' : 'end'
}
