'use client'

import { useState } from 'react'

import { CaretRightIcon } from '@phosphor-icons/react/ssr'

import type { TableColumn } from '@oztix/roadie-core/dashboard'

import { Table } from '../Table'
import { DataTableCellContent } from './DataTableCell'
import { DataTableIndent, DataTableRow, cellAttributes } from './DataTableRow'
import {
  type DataTableExpanded,
  buildGroups,
  groupKey,
  visibleNodes
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
  const allOpen = defaultExpanded === true
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
  const nodes = visibleNodes(
    buildGroups(rows, columns, groupColumns, sort),
    isOpen
  )
  return (
    <Table.Body>
      {nodes.map((node) => {
        if (node.kind === 'row')
          return (
            <DataTableRow
              key={node.row.key}
              columns={columns}
              row={node.row}
              titleKey={titleKey}
              plain={plain}
              depth={node.depth}
            />
          )
        const open = isOpen(node.key)
        return (
          <Table.Row
            key={node.key}
            data-slot='data-table-group'
            className='font-semibold text-strong'
          >
            {columns.map((column, index) => (
              <Table.Cell key={column.key} {...cellAttributes(column)}>
                {index === 0 ? (
                  <DataTableIndent depth={node.depth}>
                    <button
                      type='button'
                      aria-expanded={open}
                      onClick={() => toggle(node.key)}
                      className='group is-interactive inline-flex items-center gap-1 rounded-sm text-start active:scale-100'
                    >
                      <CaretRightIcon
                        weight='bold'
                        className='size-4 shrink-0 transition-transform group-aria-expanded:rotate-90'
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
              </Table.Cell>
            ))}
          </Table.Row>
        )
      })}
    </Table.Body>
  )
}
