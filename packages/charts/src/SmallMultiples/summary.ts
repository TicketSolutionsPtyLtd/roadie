import { fieldLabel } from '../plot/table'
import { plural } from '../plot/words'
import { panelsOf } from './panels'
import type { SmallMultiplesProps } from './types'

export function smallMultiplesSummary(props: SmallMultiplesProps) {
  if (props.takeaway) return props.takeaway
  const panels = panelsOf(props)
  const measure = fieldLabel(props.chart.y)
  const by = fieldLabel(props.by).toLowerCase()
  if (panels.length === 0)
    return `${measure} by ${by}, with no ${plural(by)} to show yet`
  if (panels.length === 1) return `${measure} for ${panels[0]!.key}`
  return `${measure} by ${by}, one panel for each of ${panels.length} ${plural(by)}`
}
