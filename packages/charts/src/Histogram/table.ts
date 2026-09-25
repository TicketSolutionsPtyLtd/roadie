import { formatValue } from '@oztix/roadie-core/dataviz'

import type { ChartTable } from '../Chart'
import { fieldLabel } from '../plot/table'
import { fullFormat } from '../plot/values'
import type { Bin } from './bin'
import { binValues, histogramValues } from './bin'
import type { HistogramProps } from './types'

/**
 * The values a bin holds. Whole numbers name their last integer, since a bin
 * never holds its upper edge: "1", "3 to 4". Other data names both edges.
 */
export function binLabel(
  props: Pick<HistogramProps, 'format'>,
  { from, to, whole }: Pick<Bin, 'from' | 'to' | 'whole'>
) {
  const shown = (value: number) => formatValue(value, fullFormat(props.format))
  const last = whole ? to - 1 : to
  return last === from ? shown(from) : `${shown(from)} to ${shown(last)}`
}

export function histogramTable(props: HistogramProps): ChartTable {
  const bins = binValues(histogramValues(props), props)
  return {
    columns: [
      { key: 'range', header: fieldLabel(props.x), kind: 'text' },
      { key: 'count', header: 'Count', kind: 'number', format: 'number' }
    ],
    rows: bins.map((b) => ({ range: binLabel(props, b), count: b.count }))
  }
}
