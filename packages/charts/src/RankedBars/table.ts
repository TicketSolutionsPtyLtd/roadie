import type { TableRow } from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { fieldLabel, valueColumn, xColumn } from '../plot/table'
import { rankRows } from './rank'
import type { RankedBarsProps } from './types'

const SHARE = 'share'

export function rankedBarsTable(props: RankedBarsProps): ChartTable {
  const rows = rankRows(props)
  const total = rows.reduce((sum, row) => sum + (row.value ?? 0), 0) || 1
  const reference = props.reference
  const columns = [
    xColumn(props.x),
    valueColumn(props.y, fieldLabel(props.y), props.format),
    ...(props.share ? [valueColumn(SHARE, 'Share', 'percent')] : []),
    ...(reference
      ? [valueColumn(reference.field, reference.label, props.format)]
      : [])
  ]
  return {
    columns,
    rows: rows.map(({ name, value, reference: ref }): TableRow => ({
      [props.x]: name,
      [props.y]: value,
      ...(props.share && { [SHARE]: value === null ? null : value / total }),
      ...(reference && { [reference.field]: ref })
    }))
  }
}
