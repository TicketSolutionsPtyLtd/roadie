import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { SPARKLINE_MIN_POINTS, sparklineGeometry } from './geometry'

export { SPARKLINE_MIN_POINTS, sparklineGeometry } from './geometry'
export type { SparklineGeometry } from './geometry'

export type SparklineReference = { value: number; label: string }

export type SparklineProps = ComponentProps<'div'> & {
  values: readonly number[]
  reference?: SparklineReference
  /** Accessible name when the sparkline stands alone. Omit inside a tile. */
  label?: string
  summary?: string
  /** @default 5 */
  minPoints?: number
}

export function Sparkline({
  values,
  reference,
  label,
  summary,
  minPoints = SPARKLINE_MIN_POINTS,
  className,
  ...props
}: SparklineProps) {
  const geometry = sparklineGeometry(values, reference?.value, minPoints)
  if (!geometry) return null
  const name = [label, summary].filter(Boolean).join('. ')
  return (
    <div
      data-slot='sparkline'
      role={label ? 'img' : undefined}
      aria-label={label ? name : undefined}
      aria-hidden={label ? undefined : true}
      className={cn('relative h-8 w-full', className)}
      {...props}
    >
      <svg
        viewBox='0 0 100 100'
        preserveAspectRatio='none'
        className='absolute inset-0 size-full overflow-visible'
        aria-hidden
      >
        {geometry.referenceY !== undefined && (
          <line
            x1={0}
            x2={100}
            y1={geometry.referenceY}
            y2={geometry.referenceY}
            className='stroke-chart-median'
            strokeWidth={1}
            strokeDasharray='2 2'
            vectorEffect='non-scaling-stroke'
          />
        )}
        <polyline
          points={geometry.points}
          fill='none'
          className='stroke-chart-highlight'
          strokeWidth={1.5}
          strokeLinejoin='round'
          strokeLinecap='round'
          vectorEffect='non-scaling-stroke'
        />
      </svg>
      <span
        className='absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-highlight ring-[1.5px] ring-(--intent-bg-raised)'
        style={{ left: `${geometry.end.x}%`, top: `${geometry.end.y}%` }}
      />
    </div>
  )
}
Sparkline.displayName = 'Sparkline'
