import type { TableRow } from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { valueColumn, xColumn } from '../plot/table'
import { shareStyle } from '../plot/values'
import { seriesOrder, stackCategories, tableParts } from './stack'
import type { StackedBarsProps } from './types'

export function unusedKey(base: string, taken: readonly string[]) {
  let key = base
  while (taken.includes(key)) key = `_${key}`
  return key
}

/** Every value the data measures, including the zeros the bars leave out, and every category. */
export function stackedBarsTable(props: StackedBarsProps): ChartTable {
  const parts = tableParts(props)
  const names = seriesOrder(parts)
  const totalKey = unusedKey('total', [props.x, ...names])
  const share = props.mode === 'share'
  const columns = [
    xColumn(props.x),
    ...names.map((name) =>
      valueColumn(name, name, share ? shareStyle(props) : props)
    ),
    valueColumn(totalKey, 'Total', props)
  ]
  const rows = stackCategories(props).map((category) => {
    const own = parts.filter((p) => p.x === category)
    if (own.length === 0) return { [props.x]: category }
    const total = own.reduce((sum, p) => sum + p.y, 0)
    const row: TableRow = { [props.x]: category }
    for (const p of own) row[p.series] = share ? (total ? p.y / total : 0) : p.y
    row[totalKey] = total
    return row
  })
  return { columns, rows }
}
