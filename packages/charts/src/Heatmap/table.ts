import type { TableRow } from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { fieldLabel, valueColumn } from '../plot/table'
import { firstSeen, heatCells } from './cells'
import type { HeatmapProps } from './types'

const labelsOf = (props: HeatmapProps, field: string) =>
  firstSeen(props.data.map((r) => String(r[field] ?? '')).filter(Boolean))

export function heatmapTable(props: HeatmapProps): ChartTable {
  const cells = heatCells(props)
  const columns = labelsOf(props, props.columns)
  return {
    columns: [
      { key: props.rows, header: fieldLabel(props.rows), kind: 'text' },
      ...columns.map((c) => valueColumn(c, c, props.format))
    ],
    rows: labelsOf(props, props.rows).map((row) => {
      const out: TableRow = { [props.rows]: row }
      for (const column of columns)
        out[column] =
          cells.find((c) => c.row === row && c.column === column)?.value ?? null
      return out
    })
  }
}
