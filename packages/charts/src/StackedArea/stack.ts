import { OTHER, rollupOther } from '../plot/series'
import { isTimeField, parseX } from '../plot/time'
import { finiteOrNull } from '../plot/values'
import type { StackedAreaProps } from './types'

type Reading = { x: number; series: string; y: number; index: number }

/** One series at one x, with its share and where its band sits in the stack. */
export type Layer = Reading & { share: number; start: number; end: number }

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
    const values = order.map((series) => byKey.get(keyOf(x, series)))
    const total = values.reduce((sum, r) => sum + (r?.y ?? 0), 0)
    let start = 0
    return order.map((series, i): Layer => {
      const y = values[i]?.y ?? 0
      const share = total ? y / total : 0
      const size = props.mode === 'share' ? share : y
      const layer = {
        x,
        series,
        y,
        index: values[i]?.index ?? -1,
        share,
        start,
        end: start + size
      }
      start += size
      return layer
    })
  })
}
