import type { ChartTable } from '../Chart'
import { valueColumn } from '../plot/table'
import { funnelRows } from './steps'
import type { FunnelProps } from './types'

export function funnelTable(props: FunnelProps): ChartTable {
  return {
    columns: [
      { key: 'step', header: 'Step', kind: 'text' },
      valueColumn('count', 'Count', props.format),
      valueColumn('ofPrevious', 'Of previous', 'percent'),
      valueColumn('ofFirst', 'Of first', 'percent'),
      valueColumn('dropped', 'Dropped', props.format)
    ],
    rows: funnelRows(props).map((r) => ({
      step: r.label,
      count: r.value,
      ofPrevious: r.ofPrevious,
      ofFirst: r.ofFirst,
      dropped: r.dropped
    }))
  }
}
