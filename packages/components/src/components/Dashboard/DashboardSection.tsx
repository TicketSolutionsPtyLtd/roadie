import { Children, type ComponentProps, isValidElement } from 'react'

import {
  CARD_SIZES,
  type CardSize,
  findRowGaps
} from '@oztix/roadie-core/dashboard-layout'
import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { StatTile } from '../StatTile'

export type DashboardSectionProps = Omit<ComponentProps<'section'>, 'title'> & {
  title: string
  description?: string
}

const warned = new Set<string>()

const isCardSize = (size: unknown): size is CardSize =>
  typeof size === 'string' && (CARD_SIZES as readonly string[]).includes(size)

function sizesOf(children: DashboardSectionProps['children']) {
  return Children.toArray(children).flatMap((child, index) => {
    if (!isValidElement<{ size?: unknown }>(child)) return []
    const size = child.type === StatTile ? 'stat' : child.props.size
    return isCardSize(size) ? [{ id: String(index + 1), size }] : []
  })
}

function warnAboutGaps(
  title: string,
  children: DashboardSectionProps['children']
) {
  if (!isDev() || warned.has(title)) return
  const gaps = findRowGaps(sizesOf(children))
  if (gaps.length === 0) return
  warned.add(title)
  const details = gaps
    .map(
      (gap) => `${gap.width} row ${gap.row + 1} leaves ${gap.emptyTracks} empty`
    )
    .join('; ')
  console.warn(
    `[Roadie Dashboard] "${title}" has rows that don't fill: ${details}. See /charts/dashboards.`
  )
}

export function DashboardSection({
  title,
  description,
  className,
  children,
  ...props
}: DashboardSectionProps) {
  warnAboutGaps(title, children)
  return (
    <section
      data-slot='dashboard-section'
      className={cn('grid gap-4', className)}
      {...props}
    >
      <div className='grid gap-1'>
        <h2 className='text-display-ui-5 text-strong'>{title}</h2>
        {description && <p className='text-sm text-subtle'>{description}</p>}
      </div>
      <div data-slot='dashboard-grid'>{children}</div>
    </section>
  )
}
DashboardSection.displayName = 'Dashboard.Section'
