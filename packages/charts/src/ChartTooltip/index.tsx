import { type ComponentProps, Fragment } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type ChartLegendShape, LegendKey } from '../ChartLegend'

export type ChartTooltipRow = {
  label: string
  value: string
  color?: string
  shape?: ChartLegendShape
}
export type ChartTooltipProps = ComponentProps<'div'> & {
  title?: string
  rows: readonly ChartTooltipRow[]
}

export function ChartTooltip({
  title,
  rows,
  className,
  ...props
}: ChartTooltipProps) {
  return (
    <div
      data-slot='chart-tooltip'
      className={cn(
        'grid gap-1 rounded-xl emphasis-floating px-3 py-2 text-xs tabular-nums',
        className
      )}
      {...props}
    >
      {title && <p className='font-semibold text-strong'>{title}</p>}
      <dl className='grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1'>
        {rows.map((row) => (
          <Fragment key={row.label}>
            <dt className='flex items-center gap-1.5 text-subtle'>
              <LegendKey shape={row.shape ?? 'swatch'} color={row.color} />
              {row.label}:
            </dt>
            <dd className='text-right font-semibold text-strong'>
              {row.value}
            </dd>
          </Fragment>
        ))}
      </dl>
    </div>
  )
}
ChartTooltip.displayName = 'ChartTooltip'
