import type { ChartTable } from '../Chart'
import { unusedKey } from '../StackedBars/table'
import { fieldLabel, valueColumn, xColumn } from '../plot/table'
import { shareStyle } from '../plot/values'
import { partTotals } from './parts'
import type { DonutChartProps } from './types'

export function donutChartTable(props: DonutChartProps): ChartTable {
  const parts = partTotals(props)
  const total = parts.reduce((sum, [, value]) => sum + value, 0)
  const share = unusedKey('share', [props.x, props.y])
  return {
    columns: [
      xColumn(props.x),
      valueColumn(props.y, fieldLabel(props.y), props),
      valueColumn(share, 'Share', shareStyle(props))
    ],
    rows: parts.map(([name, value]) => ({
      [props.x]: name,
      [props.y]: value,
      [share]: value / total
    })),
    ...(parts.length > 0 && {
      totals: { label: 'Total', values: { [props.y]: total, [share]: 1 } }
    })
  }
}
