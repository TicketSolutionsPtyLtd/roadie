import type { TableRow } from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { valueColumn, xColumn } from '../plot/table'
import { segmentNames, stackSegments } from './stack'
import type { StackedBarsProps } from './types'

const TOTAL = 'Total'

export function stackedBarsTable(props: StackedBarsProps): ChartTable {
  const segments = stackSegments(props)
  const share = props.mode === 'share'
  const columns = [
    xColumn(props.x),
    ...segmentNames(props).map((name) =>
      valueColumn(name, name, share ? 'percent' : props.format)
    ),
    valueColumn(TOTAL, TOTAL, props.format)
  ]
  const rows = [...new Set(segments.map((s) => s.category))].map((category) => {
    const own = segments.filter((s) => s.category === category)
    const row: TableRow = { [props.x]: category }
    for (const s of own) row[s.series] = share ? s.share : s.value
    row[TOTAL] = own.reduce((sum, s) => sum + s.value, 0)
    return row
  })
  return { columns, rows }
}
