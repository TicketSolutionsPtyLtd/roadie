import { fieldLabel } from '../plot/table'
import { nounFor } from '../plot/words'
import { panelsOf } from './panels'
import type { SmallMultiplesProps } from './types'

export function smallMultiplesSummary(props: SmallMultiplesProps) {
  if (props.takeaway) return props.takeaway
  const count = panelsOf(props).length
  const by = fieldLabel(props.by).toLowerCase()
  return `${fieldLabel(props.chart.y)} by ${by}, one panel for each of ${count} ${nounFor(count, by)}`
}
