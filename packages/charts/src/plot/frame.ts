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
  yDomain?: readonly [number, number]
): PlotFrame {
  return {
    height,
    band,
    fontSize: band === 'narrow' ? MIN_FONT_SIZE : 12,
    ...(yDomain && { yDomain })
  }
}
