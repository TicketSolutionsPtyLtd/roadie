import type { ComponentProps } from 'react'

import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react/ssr'

import {
  type DeltaSentiment,
  type GoodWhen,
  type ValueFormat,
  deltaSentiment,
  describeDelta,
  formatDelta,
  formatValue
} from '@oztix/roadie-core/dataviz'
import { cn } from '@oztix/roadie-core/utils'

export type DeltaProps = Omit<ComponentProps<'span'>, 'children'> & {
  value: number
  /** @default 'number' */
  format?: ValueFormat
  /** @default 'up' */
  goodWhen?: GoodWhen
  /** Show `value` itself and read direction from `value - baseline` (pace index 112 vs 100). */
  baseline?: number
  /** Spoken suffix, e.g. "on last week". */
  context?: string
}

const NOT_AVAILABLE = 'Not available'

function directionOf(change: number) {
  if (!Number.isFinite(change)) return 'none'
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'flat'
}

const SENTIMENT_CLASS: Record<DeltaSentiment, string> = {
  good: 'text-chart-status-good',
  bad: 'text-chart-status-critical',
  neutral: 'text-subtle'
}

export function Delta({
  value,
  format = 'number',
  goodWhen = 'up',
  baseline,
  context,
  className,
  ...props
}: DeltaProps) {
  const change = baseline === undefined ? value : value - baseline
  const direction = directionOf(change)
  const available = direction !== 'none'
  const Arrow =
    direction === 'up'
      ? ArrowUpIcon
      : direction === 'down'
        ? ArrowDownIcon
        : null
  const shown = !available
    ? NOT_AVAILABLE
    : direction === 'flat'
      ? 'No change'
      : baseline === undefined
        ? formatDelta(value, format)
        : formatValue(value, format)
  const spoken = !available
    ? NOT_AVAILABLE
    : baseline === undefined
      ? describeDelta(change, format, goodWhen)
      : `${formatValue(value, format)}, ${describeDelta(change, format, goodWhen)}`
  return (
    <span
      data-slot='delta'
      data-direction={direction}
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-semibold whitespace-nowrap tabular-nums',
        SENTIMENT_CLASS[deltaSentiment(change, goodWhen)],
        className
      )}
      {...props}
    >
      {Arrow && <Arrow weight='bold' className='size-3 shrink-0' aria-hidden />}
      <span aria-hidden>{shown}</span>
      <span className='sr-only'>
        {context ? `${spoken}, ${context}` : spoken}
      </span>
    </span>
  )
}
Delta.displayName = 'Delta'
