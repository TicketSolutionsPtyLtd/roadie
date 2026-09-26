import { barChart } from '../BarChart/definition'
import { lineChart } from '../LineChart/definition'
import type { SmallMultiplesProps } from './types'

/** With no panels, the panel chart's own copy for having nothing to show. */
export function emptyMessage({ chart }: SmallMultiplesProps) {
  const empty = { ...chart, data: [] }
  return (
    (empty.kind === 'line'
      ? lineChart.emptyMessage(empty)
      : barChart.emptyMessage(empty)) ?? ''
  )
}
