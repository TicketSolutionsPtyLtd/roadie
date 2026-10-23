import type { ComponentProps, ReactNode } from 'react'

import type { ResolvedTotals, TableColumn } from '@oztix/roadie-core/dashboard'
import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { Table, tableCellClass } from '../Table'
import { DataTableCellContent } from './DataTableCell'
import { DataTableGroups } from './DataTableGroups'
import { DataTableRow, alignOf, cellAttributes } from './DataTableRow'
import { DataTableFrame, DataTableShowAll } from './DataTableShowAll'
import { SortIcon } from './SortIcon'
import { type DataTableExpanded, groupColumnsOf, labelIndexOf } from './groups'
import {
  type DataTableSort,
  type DataTableSortDirection,
  type KeyedRow,
  cellOf,
  isSortableColumn
} from './sort'

export type DataTableSortControl = { href: string } | { onSort: () => void }

export type DataTableViewProps = Omit<ComponentProps<'div'>, 'children'> & {
  columns: readonly TableColumn[]
  rows: readonly KeyedRow[]
  caption?: string
  sort?: DataTableSort
  sortControl?: (column: TableColumn) => DataTableSortControl | undefined
  showAllLabel: string
  plain: boolean
  totals?: ResolvedTotals
  groupBy?: readonly string[]
  defaultExpanded?: DataTableExpanded
}

const titleColumn = (columns: readonly TableColumn[]) =>
  columns.find((column) => column.pin && column.kind === 'text') ??
  columns.find((column) => column.kind === 'text')

const warnedTitlePriority = new Set<string>()

function warnTitlePriority(key: string) {
  if (warnedTitlePriority.has(key) || !isDev()) return
  warnedTitlePriority.add(key)
  console.warn(
    `[Roadie] DataTable column "${key}" holds the row links, so its priority is ignored: it never hides.`
  )
}

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
  columns: allColumns,
  rows,
  caption,
  sort,
  sortControl,
  showAllLabel,
  plain,
  totals: footer,
  groupBy,
  defaultExpanded,
  className,
  ...props
}: DataTableViewProps) {
  const groupColumns = groupColumnsOf(allColumns, groupBy)
  const visible = allColumns.filter((column) => !groupColumns.includes(column))
  const title = titleColumn(visible)
  const linksRows = rows.some(({ href }) => href)
  if (linksRows && title?.priority !== undefined) warnTitlePriority(title.key)
  const labelIndex = labelIndexOf(visible)
  const labelHeader = [...groupColumns, visible[labelIndex]]
    .map((column) => column?.header)
    .join(' / ')
  // The title holds the row links and the label column the labels, so neither hides.
  const columns = visible.map((column, index) => {
    if (index === labelIndex && groupColumns.length)
      return { ...column, header: labelHeader, priority: undefined }
    return (linksRows && column === title) || (footer && index === labelIndex)
      ? { ...column, priority: undefined }
      : column
  })
  // A pinned overlay target after the first cell overhangs the table.
  const laterPinned = (column: TableColumn | undefined) =>
    !!column?.pin && column !== visible[0]
  const overlayClip =
    (linksRows && laterPinned(title)) ||
    (groupColumns.length > 0 && laterPinned(visible[labelIndex]))
  const hasPriorities = columns.some((column) => column.priority !== undefined)
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
        <Table data-overlay-clip={overlayClip ? '' : undefined}>
          {caption && <caption className='sr-only'>{caption}</caption>}
          <Table.Head>
            <Table.Row>
              {columns.map((column) => (
                <Table.HeaderCell
                  key={column.key}
                  {...cellAttributes(column)}
                  aria-sort={
                    sort?.key === column.key && isSortableColumn(column)
                      ? sort.direction
                      : undefined
                  }
                >
                  {header(column)}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>
          {groupColumns.length ? (
            <DataTableGroups
              columns={columns}
              groupColumns={groupColumns}
              rows={rows}
              sort={sort}
              defaultExpanded={defaultExpanded}
              titleKey={title?.key}
              plain={plain}
            />
          ) : (
            <Table.Body>
              {rows.map((row) => (
                <DataTableRow
                  key={row.key}
                  columns={columns}
                  row={row}
                  titleKey={title?.key}
                  plain={plain}
                />
              ))}
            </Table.Body>
          )}
          {footer && (
            <Table.Foot data-slot='data-table-totals'>
              <Table.Row>
                {columns.map((column, index) => {
                  const { align, ...attributes } = cellAttributes(column)
                  if (index === labelIndex)
                    return (
                      <th
                        key={column.key}
                        scope='row'
                        {...attributes}
                        className={tableCellClass()}
                      >
                        {footer.label}
                      </th>
                    )
                  const value = cellOf(footer.values, column.key)
                  return (
                    <Table.Cell key={column.key} {...attributes} align={align}>
                      {value !== undefined && (
                        <DataTableCellContent
                          column={column}
                          value={value}
                          plain={plain}
                        />
                      )}
                    </Table.Cell>
                  )
                })}
              </Table.Row>
            </Table.Foot>
          )}
        </Table>
      </div>
      {hasPriorities && <DataTableShowAll label={showAllLabel} />}
    </DataTableFrame>
  )
}
