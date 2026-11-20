'use client'

import { type ReactNode, useCallback, useId, useMemo, useState } from 'react'

import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { gridParts } from '../RecordGrid/parts'
import { RecordCard, recordTitle } from '../Records/RecordCard'
import { RecordPlaceholder } from '../Records/RecordPlaceholder'
import {
  type RecordGroup,
  groupRecords,
  groupableFields,
  noneLabel
} from '../Records/groups'
import type { RecordsContentProps } from '../Records/layouts'
import type { RecordCardParts, RecordsRow } from '../Records/types'
import {
  RecordsLayoutFrame,
  RecordsLayoutState,
  useRecordsLayout
} from '../Records/useRecordsLayout'
import { useSelectModeLayout } from '../Records/useSelectModeLayout'
import { Sortable } from '../Sortable'
import type { BoardLayoutConfig } from './types'

export type RecordBoardContentProps = RecordsContentProps & {
  config: BoardLayoutConfig
}

type Row = RecordsRow<object>
type Column = RecordGroup<object>
/** A move the app hasn't confirmed, or confirmed before its row caught up. */
type Move = { value: string | null; row: object; pending: boolean }

// Sortable names a list by a string. Blank options are dropped, so blank is "No <field>".
const NONE = ''
const columnValue = (key: string | null) => key ?? NONE

const columnsClass = cn(
  'grid snap-x snap-mandatory auto-cols-[85%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-2',
  '@lg/record-board:auto-cols-[minmax(16rem,1fr)]'
)
const columnClass =
  'grid snap-start content-start gap-2 rounded-xl emphasis-sunken p-2'

export function RecordBoardContent({
  className,
  maxHeight,
  fill = false,
  config
}: RecordBoardContentProps) {
  const frame = useRecordsLayout({ fill, maxHeight })
  const { records, caption, state } = frame
  const { fields, view, timeZone, rows } = records
  const parts = useMemo(
    () => gridParts(config, fields, view.layout),
    [config, fields, view.layout]
  )
  const field = useMemo(
    () => boardGroupField(fields, view.layout, config.groupBy),
    [fields, view.layout, config.groupBy]
  )
  const titleOf = useCallback(
    (record: Row) => recordTitle(record.row, record.id, parts.title, timeZone),
    [parts.title, timeZone]
  )
  const { moves, move, error } = useBoardMoves(config.onMove, titleOf)
  const columns = useMemo(
    () => (field ? boardColumns(rows, field, moves) : []),
    [field, rows, moves]
  )
  const { toggleRow } = frame
  // Shift ranges run down each column in turn, as the cards read.
  const onToggle = useCallback(
    (id: string, range: boolean) =>
      toggleRow(
        id,
        range,
        columns.flatMap((column) => column.rows.map((record) => record.id))
      ),
    [toggleRow, columns]
  )
  // Cards have no checkboxes, so the board selects only through Select mode.
  const selecting = useSelectModeLayout(true)
  const group = useId()
  const movable = Boolean(config.onMove) && !selecting
  const onMove = (id: string, value: string | null) => {
    const record = rows.find((row) => row.id === id)
    if (record) void move(record, value)
  }

  const body =
    state === 'loading' ? (
      <BoardSkeleton parts={parts} />
    ) : state ? (
      <RecordsLayoutState key={state} kind={state} records={records} />
    ) : (
      <div className='grid gap-3'>
        {error && (
          <p role='alert' className='text-sm text-subtle intent-danger'>
            {error}
          </p>
        )}
        <div
          role='group'
          aria-label={caption}
          aria-busy={frame.busy || undefined}
          data-slot='record-board-body'
          className={columnsClass}
        >
          {columns.map((column) => (
            <section
              key={columnValue(column.key)}
              aria-label={column.label}
              data-slot='record-board-column'
              className={columnClass}
            >
              <h2
                aria-hidden
                className='flex gap-1.5 px-2 pt-1 text-display-ui-6 text-strong'
              >
                {column.label}
                <span className='font-normal text-subtle tabular-nums'>
                  {column.rows.length}
                </span>
              </h2>
              <BoardCards
                column={column}
                group={group}
                movable={movable}
                onMove={onMove}
                titleOf={titleOf}
              >
                {(record) => (
                  <RecordCard
                    id={record.id}
                    row={record.row}
                    parts={parts}
                    timeZone={timeZone}
                    href={records.getRowHref?.(record.row)}
                    selected={frame.isSelected?.(record.id)}
                    selecting={selecting}
                    onToggle={onToggle}
                    rowActions={frame.rowActions}
                    handle={movable && <Sortable.Handle size='xs' />}
                  />
                )}
              </BoardCards>
            </section>
          ))}
        </div>
      </div>
    )

  return (
    <RecordsLayoutFrame
      frame={frame}
      slot='record-board'
      fill={fill}
      maxHeight={maxHeight}
      className={cn('@container/record-board', className)}
    >
      {body}
    </RecordsLayoutFrame>
  )
}
RecordBoardContent.displayName = 'RecordBoardContent'

function BoardCards({
  column,
  group,
  movable,
  onMove,
  titleOf,
  children
}: {
  column: Column
  group: string
  movable: boolean
  onMove: (id: string, value: string | null) => void
  titleOf: (record: Row) => string
  children: (record: Row) => ReactNode
}) {
  const items = useMemo(() => column.rows.map(({ id }) => id), [column.rows])
  return (
    <Sortable
      group={group}
      value={columnValue(column.key)}
      label={column.label}
      items={items}
      disabled={!movable}
      // Cards keep the view's sort, so only a move to another column counts.
      onReorder={() => {}}
      onTransfer={({ value, to }) => onMove(value, to === NONE ? null : to)}
    >
      <Sortable.DropZone
        render={<ul role='list' />}
        className='grid min-h-24 content-start gap-2'
      >
        {column.rows.map((record) => (
          <Sortable.Item
            key={record.id}
            value={record.id}
            label={titleOf(record)}
            render={<li />}
          >
            {children(record)}
          </Sortable.Item>
        ))}
      </Sortable.DropZone>
    </Sortable>
  )
}

function BoardSkeleton({ parts }: { parts: RecordCardParts }) {
  return (
    <div aria-hidden data-slot='record-board-skeleton' className={columnsClass}>
      {[2, 1, 1].map((count, index) => (
        <ul key={index} className={cn(columnClass, 'text-sm')}>
          {Array.from({ length: count }, (_, card) => (
            <RecordPlaceholder key={card} parts={parts} card />
          ))}
        </ul>
      ))}
    </div>
  )
}

/** The field a board view makes its columns from: its `groupBy`, else the definition's, when that field can group. */
export function boardGroupField(
  fields: readonly RecordField[],
  layout: RecordLayout,
  fallback: string
): RecordField | undefined {
  const key = layout.type === 'board' ? layout.groupBy : fallback
  return groupableFields(fields).find((field) => field.key === key)
}

/** Every option's column with moves applied, then "No <field>" even when empty, so cards can move there. */
function boardColumns(
  rows: readonly Row[],
  field: RecordField,
  moves: ReadonlyMap<string, Move>
): Column[] {
  const placed = moves.size
    ? rows.map((record) => {
        const move = moves.get(record.id)
        // Once the app hands over a new row, it holds the record's real value.
        if (!move || (!move.pending && move.row !== record.row)) return record
        return { ...record, row: { ...record.row, [field.key]: move.value } }
      })
    : rows
  // A blank option never holds a record, as blank values group under "No <field>".
  const columns = groupRecords(placed, field).filter(({ key }) => key !== NONE)
  return columns[columns.length - 1]?.key === null
    ? columns
    : [...columns, { key: null, label: noneLabel(field), rows: [] }]
}

// An app rejects with a message people can read, such as a move it doesn't allow.
const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

function useBoardMoves(
  onMove: BoardLayoutConfig['onMove'],
  titleOf: (record: Row) => string
) {
  const [moves, setMoves] = useState<ReadonlyMap<string, Move>>(new Map())
  const [error, setError] = useState<string | null>(null)

  // A later move of the same card replaces this one, which then settles nothing.
  const settle = (id: string, entry: Move, next?: Move) =>
    setMoves((all) => {
      if (all.get(id) !== entry) return all
      const copy = new Map(all)
      if (next) copy.set(id, next)
      else copy.delete(id)
      return copy
    })

  const move = async (record: Row, value: string | null) => {
    if (!onMove) return
    setError(null)
    const entry: Move = { value, row: record.row, pending: true }
    setMoves((all) => new Map(all).set(record.id, entry))
    try {
      await onMove(record.row as Record<string, unknown>, value)
      settle(record.id, entry, { ...entry, pending: false })
    } catch (caught) {
      settle(record.id, entry)
      setError(messageOf(caught, `${titleOf(record)} wasn’t moved. Try again.`))
    }
  }

  return { moves, move, error }
}
