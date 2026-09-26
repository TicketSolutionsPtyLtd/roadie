import type { ChartTable } from '../Chart'
import { fieldLabel, valueColumn, xCell, xColumn } from '../plot/table'
import { isTimeField } from '../plot/time'
import { toBars } from './bars'
import type { BarChartProps } from './types'

export function barChartTable(props: BarChartProps): ChartTable {
  const isTime = isTimeField(props.data, props.x)
  const line = props.line
  const columns = [
    xColumn(props.x),
    valueColumn(props.y, fieldLabel(props.y), props.format),
    ...(line ? [valueColumn(line.y, line.label, line.format)] : [])
  ]
  const rows = toBars(props).map((bar) => ({
    [props.x]: xCell(bar.key, isTime),
    [props.y]: bar.y,
    ...(line && { [line.y]: bar.line })
  }))
  return { columns, rows }
}
