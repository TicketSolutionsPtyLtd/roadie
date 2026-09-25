import { formatValue } from '@oztix/roadie-core/dataviz'

import type { ChartTable } from '../Chart'
import { fieldLabel } from '../plot/table'
import { binValues, histogramValues } from './bin'
import type { HistogramProps } from './types'

export const rangeLabel = (
  props: Pick<HistogramProps, 'format'>,
  from: number,
  to: number
) =>
  `${formatValue(from, props.format ?? 'number')} to ${formatValue(to, props.format ?? 'number')}`

export function histogramTable(props: HistogramProps): ChartTable {
  const bins = binValues(histogramValues(props), props)
  return {
    columns: [
      { key: 'range', header: fieldLabel(props.x), kind: 'text' },
      { key: 'count', header: 'Count', kind: 'number', format: 'number' }
    ],
    rows: bins.map((b) => ({
      range: rangeLabel(props, b.from, b.to),
      count: b.count
    }))
  }
}
