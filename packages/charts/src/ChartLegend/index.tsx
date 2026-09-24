import type { ComponentProps } from 'react'

import type { LegendItem } from '@oztix/roadie-core/dashboard'
import { cn } from '@oztix/roadie-core/utils'

export type ChartLegendItem = LegendItem
export type ChartLegendShape = NonNullable<LegendItem['shape']>
export type ChartLegendProps = Omit<ComponentProps<'ul'>, 'children'> & {
  items: readonly ChartLegendItem[]
}

const DEFAULT_COLOR = 'var(--chart-highlight)'

export function LegendKey({
  shape = 'swatch',
  color = DEFAULT_COLOR
}: {
  shape?: ChartLegendShape
  color?: string
}) {
  return (
    <svg
      data-shape={shape}
      viewBox='0 0 16 8'
      className='h-2 w-4 shrink-0 overflow-visible'
      aria-hidden
    >
      {shape === 'swatch' && (
        <rect x={4} y={0} width={8} height={8} rx={2} fill={color} />
      )}
      {shape === 'band' && (
        <rect x={0} y={1} width={16} height={6} rx={2} fill={color} />
      )}
      {shape === 'line' && (
        <line
          x1={0}
          x2={16}
          y1={4}
          y2={4}
          stroke={color}
          strokeWidth={2}
          strokeLinecap='round'
        />
      )}
      {shape === 'dash' && (
        <line
          x1={0}
          x2={16}
          y1={4}
          y2={4}
          stroke={color}
          strokeWidth={1.25}
          strokeDasharray='3 3'
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
        'flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle',
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <li key={item.label} className='inline-flex items-center gap-1.5'>
          <LegendKey shape={item.shape} color={item.color} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
ChartLegend.displayName = 'ChartLegend'
