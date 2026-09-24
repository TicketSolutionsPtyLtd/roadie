import type { TableCell, TableColumn } from '@oztix/roadie-core/dashboard'
import { formatValue } from '@oztix/roadie-core/dataviz'

import { Delta } from '../Delta'
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
  plain
}: {
  column: TableColumn
  value: TableCell | undefined
  secondary?: TableCell
  plain: boolean
}) {
  if (value === null || value === undefined)
    return <Muted>{column.emptyText ?? NOT_AVAILABLE}</Muted>
  if (typeof value === 'string' && column.kind !== 'text')
    return <Muted>{value}</Muted>

  if (column.kind === 'text')
    return (
      <span className='grid'>
        <span className='font-semibold text-strong'>{String(value)}</span>
        {typeof secondary === 'string' && (
          <span className='text-xs whitespace-normal text-subtle'>
            {secondary}
          </span>
        )}
      </span>
    )

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
    const shown = formatValue(value, column.format ?? 'percent')
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
        <span>{shown}</span>
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
