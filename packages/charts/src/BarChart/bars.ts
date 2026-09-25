import { isTimeField, parseX } from '../plot/time'
import { finiteOrNull, valueDomain } from '../plot/values'
import type { BarChartProps } from './types'

export type Bar = {
  key: string
  x: number | string
  y: number | null
  line: number | null
  index: number
}

export function toBars(props: BarChartProps): Bar[] {
  const isTime = isTimeField(props.data, props.x)
  return props.data
    .map((row, index): Bar | null => {
      const raw = row[props.x]
      if (raw === null || raw === undefined) return null
      const x = isTime ? parseX(raw) : raw
      if (x === null) return null
      return {
        key: String(raw),
        x,
        y: finiteOrNull(row[props.y]),
        line: props.line ? finiteOrNull(row[props.line.y]) : null,
        index
      }
    })
    .filter((bar): bar is Bar => bar !== null)
    .sort((a, b) =>
      typeof a.x === 'number' && typeof b.x === 'number' ? a.x - b.x : 0
    )
}

export function barYExtent(props: BarChartProps): readonly [number, number] {
  return valueDomain(
    toBars(props).map((b) => b.y),
    { zero: true }
  )
}

export const hasBars = (bars: readonly Bar[]) => bars.some((b) => b.y !== null)
