import type { ChartTable } from '../Chart'
import { valueColumn } from '../plot/table'
import { shareStyle } from '../plot/values'
import { funnelRows } from './steps'
import type { FunnelProps } from './types'

export function funnelTable(props: FunnelProps): ChartTable {
  return {
    columns: [
      { key: 'step', header: 'Step', kind: 'text' },
      valueColumn('count', 'Count', props),
      valueColumn('ofPrevious', 'Of previous', shareStyle(props)),
      valueColumn('ofFirst', 'Of first', shareStyle(props)),
      valueColumn('dropped', 'Dropped', props)
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
