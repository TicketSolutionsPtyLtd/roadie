import { OTHER, rollupOther } from '../plot/series'
import { finiteOrNull } from '../plot/values'
import type { StackedBarsProps } from './types'

export type Segment = {
  category: string
  series: string
  value: number
  share: number
  start: number
  end: number
  index: number
}

type Part = { x: string; series: string; y: number; index: number }

function parts(props: StackedBarsProps): Part[] {
  const points = props.data
    .map((row, index) => ({
      x: String(row[props.x] ?? ''),
      series: String(row[props.series] ?? ''),
      y: finiteOrNull(row[props.y]),
      index
    }))
    .filter(
      (p): p is Part => p.x !== '' && p.series !== '' && p.y !== null && p.y > 0
    )
  const merged = new Map<string, Part>()
  for (const p of rollupOther(points)) {
    const key = JSON.stringify([p.x, p.series])
    const seen = merged.get(key)
    merged.set(key, seen ? { ...seen, y: seen.y + p.y } : p)
  }
  return [...merged.values()]
}

function seriesOrder(all: readonly Part[]) {
  const order = [...new Set(all.map((p) => p.series))]
  const other = order.indexOf(OTHER)
  if (other !== -1) order.push(...order.splice(other, 1))
  return order
}

export const segmentNames = (props: StackedBarsProps) =>
  seriesOrder(parts(props))

export function stackSegments(props: StackedBarsProps): Segment[] {
  const all = parts(props)
  const order = seriesOrder(all)
  const categories = [...new Set(all.map((p) => p.x))]
  return categories.flatMap((category) => {
    const own = all
      .filter((p) => p.x === category)
      .sort((a, b) => order.indexOf(a.series) - order.indexOf(b.series))
    const total = own.reduce((sum, p) => sum + p.y, 0)
    let start = 0
    return own.map((p): Segment => {
      const share = p.y / total
      const size = props.mode === 'share' ? share : p.y
      const segment = {
        category,
        series: p.series,
        value: p.y,
        share,
        start,
        end: start + size,
        index: p.index
      }
      start += size
      return segment
    })
  })
}
