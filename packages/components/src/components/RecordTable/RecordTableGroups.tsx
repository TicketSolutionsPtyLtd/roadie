'use client'

import { type CSSProperties, useId } from 'react'

import { CaretDownIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { disclosureCaretClass } from '../../variants'
import {
  type GroupCollapse,
  groupHeadingContent,
  groupHeadings,
  groupPath,
  titleTiers,
  useRecordGroups
} from '../Records/RecordGroupSection'
import type { RecordGroup } from '../Records/groups'
import { rowClass } from './RecordTableRow'
import { Row, type RowsShared } from './RecordTableRows'
import { SELECT_WIDTH } from './layout'

// The first column's text: past the checkbox track and a cell's padding when
// rows have checkboxes, else at the content inset, as the first cell's is.
const textStart = (select: boolean) =>
  ({
    '--group-text-start': select
      ? `calc(${SELECT_WIDTH}rem + var(--content-inset) + var(--spacing) * 2.5)`
      : 'var(--content-inset)'
  }) as CSSProperties

type Toggle = (id: string, range: boolean, order?: readonly string[]) => void

/**
 * A wide table's rows by group, unwindowed, as a grouped list is: grouping
 * applies to a page at most. Rowgroups can't nest, so each group is a
 * rowgroup of its title row, beside its own rows' and its inner groups'.
 */
export function RecordTableGroups({
  groups,
  shared,
  onToggle
}: {
  groups: readonly RecordGroup[]
  shared: RowsShared
  onToggle: Toggle
}) {
  const grouped = useRecordGroups(groups, onToggle)
  const rows = { ...shared, onToggle: grouped.onToggle }
  return grouped.shown.map((group, index) => (
    <TableGroup
      key={group.key ?? ''}
      group={group}
      shared={rows}
      collapse={grouped.collapse}
      first={index === 0}
    />
  ))
}

function TableGroup({
  group,
  shared,
  collapse,
  first = false,
  depth = 0,
  parent = ''
}: {
  group: RecordGroup
  shared: RowsShared
  collapse: GroupCollapse
  first?: boolean
  depth?: number
  /** The outer group's path. */
  parent?: string
}) {
  const rowsId = useId()
  const path = groupPath(parent, group)
  const open = !collapse.closed.has(path)
  const Heading = groupHeadings[Math.min(depth, groupHeadings.length - 1)]!
  const extra = groupHeadingContent(group)
  return (
    <>
      <div role='rowgroup' data-slot='record-table-group'>
        <div role='row' className={rowClass}>
          <div
            role='cell'
            aria-colspan={shared.columnCount}
            className={cn(
              'col-span-full',
              // An outer group stands apart from the rows before it.
              depth === 0 ? (first ? 'pt-1.5' : 'pt-6') : 'pt-3',
              'pb-1.5'
            )}
          >
            {/* The frame's width and stuck at its start, so the title stays in
                view as the columns scroll sideways. */}
            <div
              className='sticky start-0 grid w-[100cqi] gap-1.5'
              style={textStart(shared.isSelected !== undefined)}
            >
              <Heading
                className={cn(
                  'text-sm font-semibold text-subtler',
                  titleTiers[depth]
                )}
              >
                <button
                  type='button'
                  aria-expanded={open}
                  aria-controls={open && !group.groups ? rowsId : undefined}
                  onClick={() => collapse.setOpen(path, !open)}
                  // Its fill spans the frame as a row's does, and its text
                  // starts where the first column's does.
                  className='group/title is-interactive flex w-full cursor-pointer items-center justify-between gap-3 emphasis-subtler border-0 py-1 ps-(--group-text-start) pe-(--content-inset) text-start'
                >
                  <span className='flex gap-1.5'>
                    {group.label}{' '}
                    <span className='font-normal text-subtle tabular-nums'>
                      {group.rows.length}
                    </span>
                  </span>
                  <CaretDownIcon
                    weight='bold'
                    aria-hidden
                    className={cn(
                      disclosureCaretClass,
                      'text-subtle',
                      open && 'rotate-180'
                    )}
                  />
                </button>
              </Heading>
              {open && extra !== null && (
                <div
                  data-slot='record-table-group-heading'
                  className='ps-(--group-text-start) pe-(--content-inset) text-sm text-subtle'
                >
                  {extra}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {open &&
        (group.groups ? (
          group.groups.map((inner) => (
            <TableGroup
              key={inner.key ?? ''}
              group={inner}
              shared={shared}
              collapse={collapse}
              depth={depth + 1}
              parent={path}
            />
          ))
        ) : (
          <div role='rowgroup' id={rowsId} data-slot='record-table-body'>
            {group.rows.map((record) => (
              <Row key={record.id} shared={shared} row={record} />
            ))}
          </div>
        ))}
    </>
  )
}
