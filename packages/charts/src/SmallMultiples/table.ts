import type { TableColumn } from '@oztix/roadie-core/dashboard'

import { barChartTable } from '../BarChart/table'
import type { ChartTable } from '../Chart'
import { lineChartTable } from '../LineChart/table'
import { fieldLabel } from '../plot/table'
import { panelsOf } from './panels'
import type { SmallMultiplesProps } from './types'

export function smallMultiplesTable(props: SmallMultiplesProps): ChartTable {
  const { chart } = props
  const tables = panelsOf(props).map((panel) => ({
    key: panel.key,
    table:
      chart.kind === 'line'
        ? lineChartTable({ ...chart, data: panel.rows })
        : barChartTable({ ...chart, data: panel.rows })
  }))
  const columns: TableColumn[] = [
    { key: props.by, header: fieldLabel(props.by), kind: 'text' }
  ]
  for (const { table } of tables)
    for (const column of table.columns)
      if (!columns.some((c) => c.key === column.key)) columns.push(column)
  return {
    columns,
    rows: tables.flatMap(({ key, table }) =>
      table.rows.map((row) => ({ [props.by]: key, ...row }))
    )
  }
}
