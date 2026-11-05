import type { ChartTable } from '../Chart'
import { fieldLabel, valueColumn, xCell, xColumn } from '../plot/table'
import { isTimeField } from '../plot/time'
import { comparisonLabel, hasComparison, toBars } from './bars'
import type { BarChartProps } from './types'

export function barChartTable(props: BarChartProps): ChartTable {
  const isTime = isTimeField(props.data, props.x)
  const line = props.line
  const bars = toBars(props)
  const comparison = hasComparison(bars) ? props.comparison : undefined
  const columns = [
    xColumn(props.x),
    valueColumn(props.y, fieldLabel(props.y), props),
    ...(line ? [valueColumn(line.y, line.label, line)] : []),
    ...(comparison
      ? [
          valueColumn(
            comparison.y,
            comparisonLabel(props) ?? comparison.y,
            props
          )
        ]
      : [])
  ]
  const rows = bars.map((bar) => ({
    [props.x]: xCell(bar.key, isTime),
    [props.y]: bar.y,
    ...(line && { [line.y]: bar.line }),
    ...(comparison && { [comparison.y]: bar.comparison })
  }))
  return { columns, rows }
}
