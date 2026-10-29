import type { ValueFormat } from '@oztix/roadie-core/dataviz'

export type FunnelStep = { label: string; value: number }

export type FunnelProps = {
  /** Each step, in order, with how many reached it. At least two. */
  steps: FunnelStep[]
  /** @default 'number' */
  format?: ValueFormat
  /** Fixed decimal places for number, percent, points, and currency, from none to four. Shares follow it too. Axis ticks stay short. @default 2 for currency */
  decimals?: number
  /** Drops the decimals from a whole value: $1,200 instead of $1,200.00. */
  trimZeros?: boolean
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  className?: string
}
