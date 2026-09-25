import { fieldLabel } from '../plot/table'
import { panelsOf } from './panels'
import type { SmallMultiplesProps } from './types'

export function smallMultiplesSummary(props: SmallMultiplesProps) {
  if (props.takeaway) return props.takeaway
  return `${fieldLabel(props.chart.y)} by ${fieldLabel(props.by).toLowerCase()}, ${panelsOf(props).length} panels`
}
