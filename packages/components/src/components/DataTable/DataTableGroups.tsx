'use client'

import { useState } from 'react'

import { CaretRightIcon } from '@phosphor-icons/react/ssr'

import type { TableColumn } from '@oztix/roadie-core/dashboard'

import { Table } from '../Table'
import { DataTableCellContent } from './DataTableCell'
import {
  DataTableCollapse,
  DataTableIndent,
  DataTableRow,
  cellAttributes
} from './DataTableRow'
import {
  type DataTableExpanded,
  buildGroups,
  flattenNodes,
  groupKey,
  labelIndexOf
} from './groups'
import { type DataTableSort, type KeyedRow, cellOf } from './sort'

export type DataTableGroupsProps = {
  columns: readonly TableColumn[]
  groupColumns: readonly TableColumn[]
  rows: readonly KeyedRow[]
  sort?: DataTableSort
  defaultExpanded?: DataTableExpanded
  titleKey?: string
  plain: boolean
}

// Each group's key flips its open state from the default.
function useExpanded(defaultExpanded: DataTableExpanded = false) {
  const [toggled, setToggled] = useState(
    () =>
      new Set(
        typeof defaultExpanded === 'boolean'
          ? []
          : defaultExpanded.map((path) => groupKey(path))
      )
  )
  const [allOpen] = useState(defaultExpanded === true)
  return {
    isOpen: (key: string) => allOpen !== toggled.has(key),
    toggle: (key: string) =>
      setToggled((previous) => {
        const next = new Set(previous)
        if (!next.delete(key)) next.add(key)
        return next
      })
  }
}

export function DataTableGroups({
  columns,
  groupColumns,
  rows,
  sort,
  defaultExpanded,
  titleKey,
  plain
}: DataTableGroupsProps) {
  const { isOpen, toggle } = useExpanded(defaultExpanded)
  const entries = flattenNodes(
    buildGroups(rows, columns, groupColumns, sort),
    isOpen
  )
  const labelIndex = labelIndexOf(columns)
  const last = entries.findLastIndex(({ collapsed }) => !collapsed)
  // Closed groups keep their rows, collapsed, so they open and close like an
  // Accordion. Collapsed rows are hidden from screen readers and the keyboard.
  const rowProps = (collapsed: boolean, index: number) => ({
    'data-collapsed': collapsed || undefined,
    'data-last': index === last || undefined,
    'aria-hidden': collapsed || undefined,
    inert: collapsed || undefined
  })
  return (
    <Table.Body data-grouped=''>
      {entries.map(({ node, collapsed }, entryIndex) => {
        if (node.kind === 'row')
          return (
            <DataTableRow
              key={node.row.key}
              columns={columns}
              row={node.row}
              titleKey={titleKey}
              plain={plain}
              depth={node.depth}
              rowProps={rowProps(collapsed, entryIndex)}
            />
          )
        const open = isOpen(node.key)
        return (
          <Table.Row
            key={node.key}
            {...rowProps(collapsed, entryIndex)}
            data-slot='data-table-group'
            data-group=''
            className='is-interactive-within font-semibold text-strong'
          >
            {columns.map((column, index) => (
              <Table.Cell key={column.key} {...cellAttributes(column)}>
                <DataTableCollapse>
                  {index === labelIndex ? (
                    <DataTableIndent depth={node.depth}>
                      <button
                        type='button'
                        aria-expanded={open}
                        onClick={() => toggle(node.key)}
                        data-interactive-target=''
                        className='group inline-flex cursor-pointer items-center gap-1 text-start'
                      >
                        <CaretRightIcon
                          weight='bold'
                          className='size-3 shrink-0 text-subtle transition-transform duration-moderate group-aria-expanded:rotate-90 rtl:-scale-x-100 rtl:group-aria-expanded:-rotate-90'
                          aria-hidden
                        />
                        <DataTableCellContent
                          column={node.column}
                          value={node.value}
                          plain={plain}
                        />
                      </button>
                    </DataTableIndent>
                  ) : (
                    cellOf(node.values, column.key) !== undefined && (
                      <DataTableCellContent
                        column={column}
                        value={cellOf(node.values, column.key)}
                        plain={plain}
                      />
                    )
                  )}
                </DataTableCollapse>
              </Table.Cell>
            ))}
          </Table.Row>
        )
      })}
    </Table.Body>
  )
}
