import type { TableRow } from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { fieldLabel, valueColumn, xColumn } from '../plot/table'
import { finiteOrNull } from '../plot/values'
import type { RankedBarsProps } from './types'

const SHARE = 'share'

const byValue = (a: number | null, b: number | null) =>
  a === null ? (b === null ? 0 : 1) : b === null ? -1 : b - a

export function rankedBarsTable(props: RankedBarsProps): ChartTable {
  const values = props.data.map((row) => finiteOrNull(row[props.y]))
  const total = values.reduce<number>((sum, v) => sum + (v ?? 0), 0) || 1
  const reference = props.reference
  const columns = [
    xColumn(props.x),
    valueColumn(props.y, fieldLabel(props.y), props.format),
    ...(props.share ? [valueColumn(SHARE, 'Share', 'percent')] : []),
    ...(reference
      ? [valueColumn(reference.field, reference.label, props.format)]
      : [])
  ]
  const rows = props.data
    .map((row, i) => ({ row, value: values[i] ?? null }))
    .sort((a, b) => byValue(a.value, b.value))
    .map(({ row, value }): TableRow => ({
      [props.x]: row[props.x] ?? null,
      [props.y]: row[props.y] ?? null,
      ...(props.share && { [SHARE]: value === null ? null : value / total }),
      ...(reference && { [reference.field]: row[reference.field] ?? null })
    }))
  return { columns, rows }
}
