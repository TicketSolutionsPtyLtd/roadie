import type { TableRow } from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { valueColumn, xColumn } from '../plot/table'
import { segmentNames, stackSegments } from './stack'
import type { StackedBarsProps } from './types'

function unusedKey(base: string, taken: readonly string[]) {
  let key = base
  while (taken.includes(key)) key = `_${key}`
  return key
}

export function stackedBarsTable(props: StackedBarsProps): ChartTable {
  const segments = stackSegments(props, false)
  const names = segmentNames(props, false)
  const totalKey = unusedKey('total', [props.x, ...names])
  const share = props.mode === 'share'
  const columns = [
    xColumn(props.x),
    ...names.map((name) =>
      valueColumn(name, name, share ? 'percent' : props.format)
    ),
    valueColumn(totalKey, 'Total', props.format)
  ]
  const rows = [...new Set(segments.map((s) => s.category))].map((category) => {
    const own = segments.filter((s) => s.category === category)
    const row: TableRow = { [props.x]: category }
    for (const s of own) row[s.series] = share ? s.share : s.value
    row[totalKey] = own.reduce((sum, s) => sum + s.value, 0)
    return row
  })
  return { columns, rows }
}
