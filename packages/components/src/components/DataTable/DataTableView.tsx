import type { ComponentProps, ReactNode } from 'react'

import type { TableColumn, TableRow } from '@oztix/roadie-core/dashboard'
import { cn } from '@oztix/roadie-core/utils'

import { Table } from '../Table'
import { DataTableCellContent } from './DataTableCell'
import { DataTableFrame, DataTableShowAll } from './DataTableShowAll'
import { SortIcon } from './SortIcon'
import type { DataTableSort, DataTableSortDirection } from './sort'

export type DataTableSortControl = { href: string } | { onSort: () => void }

export type DataTableViewProps = Omit<ComponentProps<'div'>, 'children'> & {
  columns: readonly TableColumn[]
  rows: readonly { key: string; row: TableRow; href?: string }[]
  caption?: string
  sort?: DataTableSort
  sortControl?: (column: TableColumn) => DataTableSortControl | undefined
  showAllLabel: string
  plain: boolean
}

const titleColumn = (columns: readonly TableColumn[]) =>
  columns.find((column) => column.pin && column.kind === 'text') ??
  columns.find((column) => column.kind === 'text')

const alignOf = (column: TableColumn): 'start' | 'end' =>
  column.kind === 'number' || column.kind === 'delta' ? 'end' : 'start'

function SortableHeader({
  column,
  direction,
  control
}: {
  column: TableColumn
  direction?: DataTableSortDirection
  control: DataTableSortControl
}) {
  const className = cn(
    'group is-interactive inline-flex items-center gap-1 rounded-sm font-semibold active:scale-100',
    // Numeric headers lead with the caret so the label lines up with the figures.
    alignOf(column) === 'end' && 'flex-row-reverse',
    direction && 'text-strong'
  )
  const content = (
    <>
      {column.header}
      <SortIcon direction={direction} />
    </>
  )
  if ('href' in control)
    return (
      <a href={control.href} className={className}>
        {content}
      </a>
    )
  return (
    <button type='button' onClick={control.onSort} className={className}>
      {content}
    </button>
  )
}

export function DataTableView({
  columns,
  rows,
  caption,
  sort,
  sortControl,
  showAllLabel,
  plain,
  className,
  ...props
}: DataTableViewProps) {
  const hasPriorities = columns.some((column) => column.priority !== undefined)
  const title = titleColumn(columns)
  const cellAttributes = (column: TableColumn) => ({
    'data-priority': column.priority,
    'data-pin': column.pin || undefined,
    align: alignOf(column)
  })
  const header = (column: TableColumn): ReactNode => {
    const control = sortControl?.(column)
    if (!control) return column.header
    const direction = sort?.key === column.key ? sort.direction : undefined
    return (
      <SortableHeader column={column} direction={direction} control={control} />
    )
  }
  return (
    <DataTableFrame
      showAll={hasPriorities}
      className={cn('grid gap-2', className)}
      {...props}
    >
      <div
        data-slot='data-table-scroller'
        role='region'
        tabIndex={0}
        aria-label={`${caption ?? 'Table'}, scrolls sideways`}
      >
        <Table
          data-overlay-clip={
            title?.pin && title !== columns[0] && rows.some(({ href }) => href)
              ? ''
              : undefined
          }
        >
          {caption && <caption className='sr-only'>{caption}</caption>}
          <Table.Head>
            <Table.Row>
              {columns.map((column) => (
                <Table.HeaderCell
                  key={column.key}
                  {...cellAttributes(column)}
                  aria-sort={
                    sort?.key === column.key ? sort.direction : undefined
                  }
                >
                  {header(column)}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.map(({ key, row, href }) => {
              // An empty title shows a muted placeholder, with nothing to link.
              const linked =
                href !== undefined &&
                title !== undefined &&
                row[title.key] != null &&
                row[title.key] !== ''
              return (
                <Table.Row
                  key={key}
                  data-linked={linked || undefined}
                  className={cn(linked && 'is-interactive-within')}
                >
                  {columns.map((column) => (
                    <Table.Cell key={column.key} {...cellAttributes(column)}>
                      <DataTableCellContent
                        column={column}
                        value={row[column.key]}
                        secondary={
                          column.secondaryKey
                            ? row[column.secondaryKey]
                            : undefined
                        }
                        plain={plain}
                        href={linked && column === title ? href : undefined}
                      />
                    </Table.Cell>
                  ))}
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>
      {hasPriorities && <DataTableShowAll label={showAllLabel} />}
    </DataTableFrame>
  )
}
