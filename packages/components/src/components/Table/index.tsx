import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type TableAlign = 'start' | 'end'

const alignClass = (align: TableAlign) =>
  align === 'end' ? 'text-right' : 'text-left'

export type TableProps = ComponentProps<'table'>

function TableRoot({ className, ...props }: TableProps) {
  return (
    <table
      data-slot='table'
      className={cn('w-full border-collapse text-sm tabular-nums', className)}
      {...props}
    />
  )
}
TableRoot.displayName = 'Table'

function TableHead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead data-slot='table-head' className={cn(className)} {...props} />
}
TableHead.displayName = 'Table.Head'

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot='table-body'
      className={cn('[&>tr:last-child>td]:border-b-0', className)}
      {...props}
    />
  )
}
TableBody.displayName = 'Table.Body'

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr data-slot='table-row' className={cn(className)} {...props} />
}
TableRow.displayName = 'Table.Row'

export type TableHeaderCellProps = Omit<ComponentProps<'th'>, 'align'> & {
  /** @default 'start' */
  align?: TableAlign
}

function TableHeaderCell({
  align = 'start',
  className,
  ...props
}: TableHeaderCellProps) {
  return (
    <th
      data-slot='table-header-cell'
      scope='col'
      className={cn(
        'border-b border-normal px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-subtle first:pl-0 last:pr-0',
        alignClass(align),
        className
      )}
      {...props}
    />
  )
}
TableHeaderCell.displayName = 'Table.HeaderCell'

export type TableCellProps = Omit<ComponentProps<'td'>, 'align'> & {
  /** @default 'start' */
  align?: TableAlign
}

function TableCell({ align = 'start', className, ...props }: TableCellProps) {
  return (
    <td
      data-slot='table-cell'
      className={cn(
        'border-b border-subtler px-2.5 py-2 align-middle whitespace-nowrap first:pl-0 last:pr-0',
        alignClass(align),
        className
      )}
      {...props}
    />
  )
}
TableCell.displayName = 'Table.Cell'

const Table = TableRoot as typeof TableRoot & {
  Head: typeof TableHead
  Body: typeof TableBody
  Row: typeof TableRow
  HeaderCell: typeof TableHeaderCell
  Cell: typeof TableCell
}
Table.Head = TableHead
Table.Body = TableBody
Table.Row = TableRow
Table.HeaderCell = TableHeaderCell
Table.Cell = TableCell

export { Table }
