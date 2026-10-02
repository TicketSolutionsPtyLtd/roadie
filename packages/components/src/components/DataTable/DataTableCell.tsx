import type { TableCell, TableColumn } from '@oztix/roadie-core/dashboard'
import { columnStatus } from '@oztix/roadie-core/dashboard-layout'
import { formatValue } from '@oztix/roadie-core/dataviz'
import { cn } from '@oztix/roadie-core/utils'

import { Badge } from '../Badge'
import { Delta } from '../Delta'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { Meter } from '../Meter'
import { SPARKLINE_MIN_POINTS, Sparkline } from '../Sparkline'

const NOT_AVAILABLE = 'Not available'

const Muted = ({ children }: { children: string }) => (
  <span className='text-subtle'>{children}</span>
)

export function DataTableCellContent({
  column,
  value,
  secondary,
  plain,
  href
}: {
  column: TableColumn
  value: TableCell | undefined
  secondary?: TableCell
  plain: boolean
  /** Links a text cell's primary text, the row's title, as the row's link. */
  href?: string
}) {
  if (value === null || value === undefined)
    return <Muted>{column.emptyText ?? NOT_AVAILABLE}</Muted>
  if (column.kind === 'status') {
    const { intent, label } = columnStatus(column, String(value))
    if (plain) return <span>{label}</span>
    // Normal, not subtle: its opaque fill reads on a row's hover tint and on a card's image banner alike.
    return (
      <Badge size='sm' intent={intent}>
        {label}
      </Badge>
    )
  }
  if (typeof value === 'string' && column.kind !== 'text')
    return <Muted>{value}</Muted>

  if (column.kind === 'text') {
    const primaryClass = 'font-semibold text-strong'
    return (
      <span className='grid'>
        {href ? (
          <RoadieRoutedLink
            href={href}
            data-interactive-target=''
            className={cn(
              primaryClass,
              'justify-self-start no-underline underline-offset-2 hover:underline'
            )}
          >
            {String(value)}
          </RoadieRoutedLink>
        ) : (
          <span className={primaryClass}>{String(value)}</span>
        )}
        {typeof secondary === 'string' && (
          <span className='text-xs whitespace-normal text-subtle'>
            {secondary}
          </span>
        )}
      </span>
    )
  }

  if (column.kind === 'sparkline') {
    if (!Array.isArray(value)) return <Muted>{NOT_AVAILABLE}</Muted>
    if (plain)
      return (
        <span>{formatValue(value.at(-1) ?? Number.NaN, column.format)}</span>
      )
    if (value.length < SPARKLINE_MIN_POINTS)
      return <Muted>Not enough history</Muted>
    return <Sparkline values={value} className='h-5 w-28' />
  }

  if (typeof value !== 'number') return <Muted>{NOT_AVAILABLE}</Muted>

  if (column.kind === 'meter') {
    const max = column.max ?? 1
    const shown =
      max === 1
        ? formatValue(value, column.format ?? 'percent')
        : `${formatValue(value, column.format)} of ${formatValue(max, column.format)}`
    if (plain) return <span>{shown}</span>
    return (
      <span className='inline-flex items-center gap-2'>
        <Meter
          label={column.header}
          value={value}
          max={max}
          target={column.target}
          valueText={shown}
          className='w-28'
        />
        <span aria-hidden>{shown}</span>
      </span>
    )
  }

  if (column.kind === 'delta' && !plain)
    return (
      <Delta
        value={value}
        format={column.format}
        goodWhen={column.goodWhen}
        baseline={column.baseline}
      />
    )

  return <span>{formatValue(value, column.format)}</span>
}
