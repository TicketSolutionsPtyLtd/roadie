import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type TableAlign = 'start' | 'end'

const alignClass = (align: TableAlign) =>
  align === 'end' ? 'text-right' : 'text-left'

/** A body cell's padding, border and alignment, for a `th` that heads a row. */
export const tableCellClass = (align: TableAlign = 'start') =>
  cn(
    'border-b border-subtler px-2.5 py-2 align-middle whitespace-nowrap first:pl-0 last:pr-0',
    alignClass(align)
  )

export type TableProps = ComponentProps<'table'>

export function Table({ className, ...props }: TableProps) {
  return (
    <table
      data-slot='table'
      className={cn('w-full border-collapse text-sm tabular-nums', className)}
      {...props}
    />
  )
}

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

/** A summary row, such as totals: strong text over a rule, with no rule below. */
function TableFoot({ className, ...props }: ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot='table-foot'
      className={cn(
        '[&>tr>*]:border-t [&>tr>*]:border-b-0 [&>tr>*]:border-normal [&>tr>*]:font-semibold [&>tr>*]:text-strong',
        className
      )}
      {...props}
    />
  )
}
TableFoot.displayName = 'Table.Foot'

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
      className={cn(tableCellClass(align), className)}
      {...props}
    />
  )
}
TableCell.displayName = 'Table.Cell'

Table.Head = TableHead
Table.Body = TableBody
Table.Foot = TableFoot
Table.Row = TableRow
Table.HeaderCell = TableHeaderCell
Table.Cell = TableCell
