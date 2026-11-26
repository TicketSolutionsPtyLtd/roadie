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

// Under 40rem a group title's text starts where the rows' title text does:
// past a leading thumbnail (2.5rem) and the row's gap, or in Select mode past
// the checkbox, whose label is its box (1.25rem), padding and border wide.
// A leading value of any other kind sizes to its content, so the title starts
// at the rows' edge.
const NARROW_START = {
  plain:
    '@max-[40rem]/record-table-frame:[--group-text-start:var(--content-inset)]',
  thumbnail:
    '@max-[40rem]/record-table-frame:[--group-text-start:calc(var(--content-inset)+2.5rem+var(--spacing)*3)]',
  selecting:
    '@max-[40rem]/record-table-frame:in-data-selecting:[--group-text-start:calc(var(--content-inset)+var(--spacing)*11+2px)]'
}
// Under 40rem the title row spans the frame alone, not the columns' tracks, which would overflow it.
const NARROW_GROUP_ROW = '@max-[40rem]/record-table-frame:grid-cols-1'

/**
 * Where a group title's text starts, so it lines up with the rows' title
 * text: past the checkbox track and any leading thumbnail columns, whose
 * widths are set. A grown column before the title has no known width, so the
 * title lines up with the first column's text instead.
 */
export function groupTextStart(
  { columns, layout, title }: Pick<RowsShared, 'columns' | 'layout' | 'title'>,
  select: boolean
) {
  const titleAt = title ? columns.indexOf(title) : -1
  const before = columns.slice(0, Math.max(titleAt, 0))
  const thumbnails = before.every(
    (column, index) =>
      column.kind === 'image' &&
      column.width !== undefined &&
      column.width.grow === undefined &&
      layout.priority[index] === undefined
  )
  const past =
    (select ? SELECT_WIDTH : 0) +
    (thumbnails
      ? before.reduce((sum, column) => sum + column.width!.min, 0)
      : 0)
  const leadingAt = layout.narrow?.indexOf('leading') ?? -1
  return {
    className: cn(
      '[--group-text-start:var(--group-text-start-wide)]',
      columns[leadingAt]?.kind === 'image'
        ? NARROW_START.thumbnail
        : NARROW_START.plain,
      select && NARROW_START.selecting
    ),
    style: {
      '--group-text-start-wide': past
        ? `calc(${past}rem + var(--content-inset) + var(--spacing) * 2.5)`
        : 'var(--content-inset)'
    } as CSSProperties
  }
}

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
  const textStart = groupTextStart(shared, shared.isSelected !== undefined)
  return (
    <>
      <div role='rowgroup' data-slot='record-table-group'>
        <div
          role='row'
          className={cn(rowClass, shared.layout.narrow && NARROW_GROUP_ROW)}
        >
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
              className={cn(
                'sticky start-0 grid w-[100cqi] gap-1.5',
                textStart.className
              )}
              style={textStart.style}
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
