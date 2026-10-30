import type { PlotRow } from '@oztix/roadie-core/dashboard'

import { barYExtent } from '../BarChart/bars'
import { lineXDomain, lineYExtent, toLinePoints } from '../LineChart/points'
import { isOnAxis } from '../plot/annotations'
import { isTimeField } from '../plot/time'
import { minMax } from '../plot/values'
import type { SmallMultiplesChart, SmallMultiplesProps } from './types'

export const PANEL_HEIGHT = 140
export type Panel = { key: string; rows: PlotRow[]; chart: SmallMultiplesChart }

function rowsByPanel(props: SmallMultiplesProps) {
  const panels = new Map<string, PlotRow[]>()
  for (const row of props.data) {
    const key = row[props.by]
    if (key === null || key === undefined) continue
    const list = panels.get(String(key)) ?? []
    list.push(row)
    panels.set(String(key), list)
  }
  return [...panels.entries()]
}

// A line panel leaves off an annotation that another panel places, so only one
// that no panel can place warns that it won't show.
export function panelsOf(props: SmallMultiplesProps): Panel[] {
  const { chart } = props
  const groups = rowsByPanel(props)
  if (chart.kind !== 'line' || !chart.annotations?.length)
    return groups.map(([key, rows]) => ({ key, rows, chart }))
  const { annotations } = chart
  const placed = groups.map(([, rows]) => {
    const domain = lineXDomain(toLinePoints({ ...chart, data: rows }))
    const isTime = isTimeField(rows, chart.x)
    return annotations.map((a) => isOnAxis(a.at, domain, isTime))
  })
  const anywhere = annotations.map((_, i) => placed.some((own) => own[i]))
  return groups.map(([key, rows], panel) => ({
    key,
    rows,
    chart: {
      ...chart,
      annotations: annotations.filter(
        (_, i) => placed[panel]![i] || !anywhere[i]
      )
    }
  }))
}

export function sharedDomain(
  props: SmallMultiplesProps
): readonly [number, number] | undefined {
  if (props.shared === false) return undefined
  const { chart } = props
  const extents = rowsByPanel(props).map(([, rows]) =>
    chart.kind === 'line'
      ? lineYExtent({ ...chart, data: rows })
      : barYExtent({ ...chart, data: rows })
  )
  if (extents.length === 0) return undefined
  return [
    minMax(extents.map((e) => e[0]))[0],
    minMax(extents.map((e) => e[1]))[1]
  ]
}
