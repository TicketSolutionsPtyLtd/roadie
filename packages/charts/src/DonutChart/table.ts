import type { ChartTable } from '../Chart'
import { fieldLabel, valueColumn, xColumn } from '../plot/table'
import { shareStyle } from '../plot/values'
import { partTotals } from './parts'
import type { DonutChartProps } from './types'

const SHARE = 'share'

export function donutChartTable(props: DonutChartProps): ChartTable {
  const parts = partTotals(props)
  const total = parts.reduce((sum, [, value]) => sum + value, 0)
  return {
    columns: [
      xColumn(props.x),
      valueColumn(props.y, fieldLabel(props.y), props),
      valueColumn(SHARE, 'Share', shareStyle(props))
    ],
    rows: parts.map(([name, value]) => ({
      [props.x]: name,
      [props.y]: value,
      [SHARE]: value / total
    })),
    totals: { label: 'Total', values: { [props.y]: total, [SHARE]: 1 } }
  }
}
