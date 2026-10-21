import { OTHER, rollupOther } from '../plot/series'
import { isTimeField, parseX } from '../plot/time'
import { finiteOrNull } from '../plot/values'
import type { StackedAreaProps } from './types'

type Reading = { x: number; series: string; y: number; index: number }

/** One series at one x, with where its band starts and ends in the stack. */
export type Layer = Reading & { start: number; end: number }

const keyOf = (x: number, series: string) => JSON.stringify([x, series])

function readings(props: StackedAreaProps): Reading[] {
  const isTime = isTimeField(props.data, props.x)
  const byKey = new Map<string, Reading>()
  props.data.forEach((row, index) => {
    const x = isTime ? parseX(row[props.x]) : finiteOrNull(row[props.x])
    const series = String(row[props.series] ?? '')
    const y = finiteOrNull(row[props.y])
    if (x === null || series === '' || y === null) return
    const seen = byKey.get(keyOf(x, series))
    byKey.set(
      keyOf(x, series),
      seen ? { ...seen, y: seen.y + y } : { x, series, y, index }
    )
  })
  return [...byKey.values()]
}

const plotted = (props: StackedAreaProps, rollup: boolean) =>
  rollup ? rollupOther(readings(props)) : readings(props)

function orderOf(all: readonly Reading[]) {
  const totals = new Map<string, number>()
  for (const r of all) totals.set(r.series, (totals.get(r.series) ?? 0) + r.y)
  const named = [...totals]
    .filter(([name]) => name !== OTHER)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
  return totals.has(OTHER) ? [...named, OTHER] : named
}

/**
 * Series from the bottom of the stack up: the largest total first, Other on
 * top. The table sets `rollup` to false to keep every series.
 */
export const stackOrder = (props: StackedAreaProps, rollup = true) =>
  orderOf(plotted(props, rollup))

/** Every series at every x, stacked in order. A missing reading is zero. */
export function stackLayers(props: StackedAreaProps, rollup = true): Layer[] {
  const all = plotted(props, rollup)
  const order = orderOf(all)
  const byKey = new Map(all.map((r) => [keyOf(r.x, r.series), r]))
  const xs = [...new Set(all.map((r) => r.x))].sort((a, b) => a - b)
  return xs.flatMap((x) => {
    let start = 0
    return order.map((series): Layer => {
      const reading = byKey.get(keyOf(x, series))
      const y = reading?.y ?? 0
      const layer = {
        x,
        series,
        y,
        index: reading?.index ?? -1,
        start,
        end: start + y
      }
      start += y
      return layer
    })
  })
}
