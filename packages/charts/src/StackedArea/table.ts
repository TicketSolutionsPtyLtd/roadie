import type { TableRow } from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { unusedKey } from '../StackedBars/table'
import { valueColumn, xCell, xColumn } from '../plot/table'
import { formatTimeCell, hasTimeOfDay, isTimeField } from '../plot/time'
import { stackLayers, stackOrder } from './stack'
import type { StackedAreaProps } from './types'

/** Every layer at every x, including those the plot rolls into Other. */
export function stackedAreaTable(props: StackedAreaProps): ChartTable {
  const isTime = isTimeField(props.data, props.x)
  const hasTime = hasTimeOfDay(props.data[0]?.[props.x])
  const names = stackOrder(props, false)
  const totalKey = unusedKey('total', [props.x, ...names])
  const byX = new Map<number, TableRow>()
  for (const layer of stackLayers(props, false)) {
    const row = byX.get(layer.x) ?? {
      [props.x]: isTime
        ? formatTimeCell(layer.x, hasTime)
        : xCell(layer.x, false, props.xFormat),
      [totalKey]: 0
    }
    row[layer.series] = layer.y
    row[totalKey] = Number(row[totalKey]) + layer.y
    byX.set(layer.x, row)
  }
  return {
    columns: [
      xColumn(props.x),
      ...names.map((name) => valueColumn(name, name, props.format)),
      valueColumn(totalKey, 'Total', props.format)
    ],
    rows: [...byX.values()]
  }
}
