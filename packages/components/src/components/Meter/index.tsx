import type { ComponentProps } from 'react'

import { formatValue } from '@oztix/roadie-core/dataviz'
import { cn } from '@oztix/roadie-core/utils'

export type MeterTone = 'highlight' | 'context' | 'other'
export type MeterSegment = { value: number; label: string; tone?: MeterTone }

export type MeterProps = Omit<ComponentProps<'div'>, 'children'> & {
  label: string
  max: number
  /** A single filled value. Ignored when `segments` is set. */
  value?: number
  segments?: readonly MeterSegment[]
  target?: number
  /** Spoken value. Defaults to "1,842 of 2,400". */
  valueText?: string
}

const TONE_CLASS: Record<MeterTone, string> = {
  highlight: 'bg-chart-highlight',
  context: 'bg-chart-context',
  other: 'bg-chart-other'
}

const percentOf = (value: number, max: number) =>
  max > 0 && Number.isFinite(value)
    ? Math.min(100, Math.max(0, (value / max) * 100))
    : 0

function clampSegments(segments: readonly MeterSegment[], max: number) {
  let remaining = Math.max(0, max)
  return segments.map((segment) => {
    const value = Math.min(Math.max(0, segment.value), remaining)
    remaining -= value
    return { ...segment, value }
  })
}

export function Meter({
  label,
  max,
  value = 0,
  segments,
  target,
  valueText,
  className,
  ...props
}: MeterProps) {
  const parts = clampSegments(segments ?? [{ value, label }], max)
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  return (
    <div
      data-slot='meter'
      role='meter'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={total}
      aria-valuetext={
        valueText ?? `${formatValue(total)} of ${formatValue(max)}`
      }
      className={cn(
        'relative h-1.5 w-full rounded-full bg-(--intent-4)',
        className
      )}
      {...props}
    >
      <div className='flex size-full overflow-hidden rounded-full'>
        {parts.map((part, i) => (
          <span
            key={`${i}-${part.label}`}
            data-slot='meter-segment'
            data-chart-texture={i + 1}
            className={cn('h-full', TONE_CLASS[part.tone ?? 'highlight'])}
            style={{ width: `${percentOf(part.value, max)}%` }}
          />
        ))}
      </div>
      {target !== undefined && (
        <span
          data-slot='meter-target'
          className='absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-(--intent-text-strong)'
          style={{ left: `${percentOf(target, max)}%` }}
        />
      )}
    </div>
  )
}
Meter.displayName = 'Meter'
