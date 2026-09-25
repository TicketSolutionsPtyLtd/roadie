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

const addOrNull = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : a + b

/**
 * One bar per x, in x order. Rows that share an x add up their bars; the line
 * keeps the first value it gets, because a rate can't be summed.
 */
export function toBars(props: BarChartProps): Bar[] {
  const isTime = isTimeField(props.data, props.x)
  const bars = new Map<number | string, Bar>()
  props.data.forEach((row, index) => {
    const raw = row[props.x]
    if (raw === null || raw === undefined) return
    const x = isTime ? parseX(raw) : raw
    if (x === null) return
    const slot = isTime ? x : String(raw)
    const y = finiteOrNull(row[props.y])
    const line = props.line ? finiteOrNull(row[props.line.y]) : null
    const seen = bars.get(slot)
    bars.set(
      slot,
      seen
        ? {
            ...seen,
            y: addOrNull(seen.y, y),
            line: seen.line ?? line
          }
        : { key: String(raw), x, y, line, index }
    )
  })
  return [...bars.values()].sort((a, b) =>
    typeof a.x === 'number' && typeof b.x === 'number' ? a.x - b.x : 0
  )
}

export function barYExtent(props: BarChartProps): readonly [number, number] {
  return valueDomain(
    toBars(props).map((b) => b.y),
    { zero: true, format: props.format }
  )
}

export const hasBars = (bars: readonly Bar[]) => bars.some((b) => b.y !== null)
