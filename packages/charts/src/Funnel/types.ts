import type { ValueFormat } from '@oztix/roadie-core/dataviz'

export type FunnelStep = { label: string; value: number }

export type FunnelProps = {
  /** Each step, in order, with how many reached it. At least two. */
  steps: FunnelStep[]
  /** @default 'number' */
  format?: ValueFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  className?: string
}
