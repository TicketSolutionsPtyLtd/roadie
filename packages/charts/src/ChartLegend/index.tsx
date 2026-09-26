import type { ComponentProps } from 'react'

import type { LegendItem } from '@oztix/roadie-core/dashboard'
import { cn } from '@oztix/roadie-core/utils'

export type ChartLegendItem = LegendItem & {
  /**
   * The series slot of the marks this key names, 0 for Other. Under forced
   * colours and print, a swatch takes the same texture and a line the same
   * dash as those marks.
   */
  slot?: number
  /** Draws a dashed median through a `band` key. */
  median?: boolean
}
export type ChartLegendShape = NonNullable<LegendItem['shape']>

const OTHER_TEXTURE = 8
export type ChartLegendProps = Omit<ComponentProps<'ul'>, 'children'> & {
  items: readonly ChartLegendItem[]
}

const DEFAULT_COLOR = 'var(--chart-highlight)'
const MEDIAN_COLOR = 'var(--chart-median)'

function DashedLine({ color }: { color: string }) {
  return (
    <line
      x1={0}
      x2={16}
      y1={4}
      y2={4}
      stroke={color}
      strokeWidth={1.25}
      strokeDasharray='3 3'
    />
  )
}

export function LegendKey({
  shape = 'swatch',
  color = DEFAULT_COLOR,
  slot,
  median
}: {
  shape?: ChartLegendShape
  color?: string
  slot?: number
  median?: boolean
}) {
  return (
    <svg
      data-shape={shape}
      viewBox='0 0 16 8'
      className='h-2 w-4 shrink-0 overflow-visible'
      aria-hidden
    >
      {shape === 'swatch' && (
        <rect
          x={4}
          y={0}
          width={8}
          height={8}
          rx={2}
          fill={color}
          data-chart-texture={slot === 0 ? OTHER_TEXTURE : slot}
        />
      )}
      {shape === 'band' && (
        <>
          <rect x={0} y={1} width={16} height={6} rx={2} fill={color} />
          {median && <DashedLine color={MEDIAN_COLOR} />}
        </>
      )}
      {shape === 'dash' && <DashedLine color={color} />}
      {shape === 'line' && (
        <line
          x1={0}
          x2={16}
          y1={4}
          y2={4}
          stroke={color}
          strokeWidth={2}
          strokeLinecap='round'
          data-chart-dash={slot}
        />
      )}
      {shape === 'dot' && (
        <line
          x1={1}
          x2={16}
          y1={4}
          y2={4}
          stroke={color}
          strokeWidth={2}
          strokeDasharray='0.5 3'
          strokeLinecap='round'
        />
      )}
    </svg>
  )
}

export function ChartLegend({ items, className, ...props }: ChartLegendProps) {
  return (
    <ul
      data-slot='chart-legend'
      className={cn(
        'flex flex-wrap gap-x-3 gap-y-1 text-xs text-subtle',
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <li
          key={item.label}
          className='inline-flex items-center gap-1.5 wrap-anywhere'
        >
          <LegendKey
            shape={item.shape}
            color={item.color}
            slot={item.slot}
            median={item.median}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
ChartLegend.displayName = 'ChartLegend'
