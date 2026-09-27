import { asList } from '../plot/series'
import { finiteOrNull } from '../plot/values'
import type { ScatterProps, ScatterQuadrants } from './types'

export type ScatterPoint = {
  name: string
  xValue: number
  yValue: number
  size: number | null
  r: number
  highlighted: boolean
  index: number
}

export type ScatterQuadrant = keyof ScatterQuadrants['labels']

export const MIN_POINTS = 2
const MIN_R = 3
const MAX_R = 12
const DEFAULT_R = 4.5

// Area grows in step with the size, from the smallest dot to the largest.
const radiusByArea = (share: number) =>
  Math.sqrt(MIN_R ** 2 + (MAX_R ** 2 - MIN_R ** 2) * share)

type Measured = Omit<ScatterPoint, 'r' | 'highlighted'>

const isMeasured = (
  p: Omit<Measured, 'xValue' | 'yValue'> & {
    xValue: number | null
    yValue: number | null
  }
): p is Measured => p.xValue !== null && p.yValue !== null

export function scatterPoints(props: ScatterProps): ScatterPoint[] {
  const highlighted = asList(props.highlight)
  const measured = props.data
    .map((row, index) => ({
      name: props.label ? String(row[props.label] ?? '') : `Point ${index + 1}`,
      xValue: finiteOrNull(row[props.x]),
      yValue: finiteOrNull(row[props.y]),
      size: props.size ? finiteOrNull(row[props.size]) : null,
      index
    }))
    .filter(isMeasured)
  const maxSize = Math.max(0, ...measured.map((p) => p.size ?? 0))
  return measured.map((p) => ({
    ...p,
    r:
      p.size !== null && p.size >= 0 && maxSize > 0
        ? radiusByArea(p.size / maxSize)
        : DEFAULT_R,
    highlighted: highlighted.includes(p.name)
  }))
}

export function quadrantOf(
  point: ScatterPoint,
  quadrants: ScatterQuadrants
): ScatterQuadrant {
  const top = point.yValue >= quadrants.y
  const right = point.xValue >= quadrants.x
  if (top) return right ? 'topRight' : 'topLeft'
  return right ? 'bottomRight' : 'bottomLeft'
}
