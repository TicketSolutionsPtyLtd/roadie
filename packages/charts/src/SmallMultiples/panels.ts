import type { PlotRow } from '@oztix/roadie-core/dashboard'

import { barYExtent } from '../BarChart/bars'
import { lineYExtent } from '../LineChart/points'
import type { SmallMultiplesProps } from './types'

export const PANEL_HEIGHT = 140
export type Panel = { key: string; rows: PlotRow[] }

export function panelsOf(props: SmallMultiplesProps): Panel[] {
  const panels = new Map<string, PlotRow[]>()
  for (const row of props.data) {
    const key = row[props.by]
    if (key === null || key === undefined) continue
    const list = panels.get(String(key)) ?? []
    list.push(row)
    panels.set(String(key), list)
  }
  return [...panels.entries()].map(([key, rows]) => ({ key, rows }))
}

export function sharedDomain(
  props: SmallMultiplesProps
): readonly [number, number] | undefined {
  if (props.shared === false) return undefined
  const { chart } = props
  const extents = panelsOf(props).map((panel) =>
    chart.kind === 'line'
      ? lineYExtent({ ...chart, data: panel.rows })
      : barYExtent({ ...chart, data: panel.rows })
  )
  if (extents.length === 0) return undefined
  return [
    Math.min(...extents.map((e) => e[0])),
    Math.max(...extents.map((e) => e[1]))
  ]
}
