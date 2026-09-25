import type { PlotRow } from '@oztix/roadie-core/dashboard'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'

export type ScatterQuadrants = {
  /** Where the vertical reference line crosses the x axis. */
  x: number
  /** Where the horizontal reference line crosses the y axis. */
  y: number
  /** A name for each quadrant, by what to do rather than the numbers. */
  labels: {
    topLeft: string
    topRight: string
    bottomLeft: string
    bottomRight: string
  }
}

export type ScatterProps = {
  /** Rows of plain values, one per point. */
  data: PlotRow[]
  /** Field for the horizontal position. */
  x: string
  /** Field for the vertical position. */
  y: string
  /** Format of y. @default 'number' */
  format?: ValueFormat
  /** Format of x. @default 'number' */
  xFormat?: ValueFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /** Field that sizes each point by area. */
  size?: string
  /** Field that names each point. Only highlighted points are labelled on the plot. */
  label?: string
  /** Points that tell the story, by label, in the highlight. The rest are context. */
  highlight?: string | string[]
  /** Two reference lines and a name for each quadrant. */
  quadrants?: ScatterQuadrants
  className?: string
}
