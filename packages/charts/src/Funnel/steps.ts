import type { FunnelProps, FunnelStep } from './types'

export type FunnelRow = FunnelStep & {
  ofFirst: number
  ofPrevious: number | null
  dropped: number | null
  index: number
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0)

// A repeated label keeps its first step; validateDashboard reports the rest.
const uniqueSteps = (steps: readonly FunnelStep[]) =>
  steps.filter(
    (step, i) => steps.findIndex((other) => other.label === step.label) === i
  )

export function funnelRows(props: FunnelProps): FunnelRow[] {
  const steps = uniqueSteps(props.steps)
  const first = steps[0]?.value ?? 0
  return steps.map((step, index) => {
    const previous = index > 0 ? steps[index - 1]!.value : null
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
