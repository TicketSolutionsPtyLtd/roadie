import type { FunnelProps, FunnelStep } from './types'

export type FunnelRow = FunnelStep & {
  ofFirst: number
  ofPrevious: number | null
  dropped: number | null
  index: number
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0)

export function funnelRows(props: FunnelProps): FunnelRow[] {
  const first = props.steps[0]?.value ?? 0
  return props.steps.map((step, index) => {
    const previous = index > 0 ? props.steps[index - 1]!.value : null
    return {
      ...step,
      index,
      ofFirst: ratio(step.value, first),
      ofPrevious: previous === null ? null : ratio(step.value, previous),
      dropped: previous === null ? null : previous - step.value
    }
  })
}

export function biggestDrop(rows: readonly FunnelRow[]): FunnelRow | null {
  return rows
    .filter((r) => r.ofPrevious !== null)
    .reduce<FunnelRow | null>(
      (worst, r) => (!worst || r.ofPrevious! < worst.ofPrevious! ? r : worst),
      null
    )
}
