'use client'

import {
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type { RecordLayout } from '@oztix/roadie-core/records'
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
import type {
  RecordCardParts,
  RecordsField,
  RecordsRow
} from '../Records/types'
import {
  RecordsLayoutFrame,
  RecordsLayoutState,
  useRecordsLayout
} from '../Records/useRecordsLayout'
import { useSelectModeLayout } from '../Records/useSelectModeLayout'
import { Sortable } from '../Sortable'
import { type BoardLane, BoardLanes, laneKey } from './RecordBoardLanes'
import type { BoardLayoutConfig, RecordGroupChanges } from './types'

export type RecordBoardContentProps = RecordsContentProps & {
  config: BoardLayoutConfig
}

type Row = RecordsRow<object>
type Column = RecordGroup<object>
type Changes = RecordGroupChanges
/** A move the app hasn't confirmed, or confirmed before its row caught up. */
type Move = { changes: Changes; row: object; pending: boolean }

// Sortable names a list by a string: here, the cell's column and lane keys.
const cellValue = (column: Column, lane?: Column) =>
  JSON.stringify([column.key, lane?.key ?? null])
const cellKeys = (value: string) => JSON.parse(value) as (string | null)[]

const columnsClass = cn(
  'grid snap-x snap-mandatory auto-cols-[85%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-2',
  '@lg/record-board:auto-cols-[minmax(14rem,1fr)]'
)
const columnClass =
  'grid snap-start content-start gap-2 rounded-xl emphasis-subtle p-2'

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
  const { column: field, lane: laneField } = useMemo(
    () => boardGroupFields(fields, view.layout, config.groupBy),
    [fields, view.layout, config.groupBy]
  )
  const titleOf = useCallback(
    (record: Row) => recordTitle(record.row, record.id, parts.title, timeZone),
    [parts.title, timeZone]
  )
  const { moves, move, error, putBack } = useBoardMoves(config.onMove, titleOf)
  const bodyRef = useRef<HTMLDivElement>(null)
  // A card put back remounts in its old column, taking focus from its handle.
  useLayoutEffect(() => {
    const active = document.activeElement
    if (!putBack || (active && active !== document.body)) return
    bodyRef.current
      ?.querySelector<HTMLElement>(
        `[data-record-id="${CSS.escape(putBack.id)}"] [data-slot="sortable-handle"]`
      )
      ?.focus()
  }, [putBack])
  const placed = useMemo(() => placeMoves(rows, moves), [rows, moves])
  const columns = useMemo(
    () => (field ? boardGroups(placed, field) : []),
    [field, placed]
  )
  const lanes = useMemo(
    () => laneField && boardLanes(placed, columns, laneField),
    [laneField, placed, columns]
  )
  // Collapsed lanes: the session's, never the view's.
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set())
  // A card moved into a collapsed lane is out of sight, so focus goes to its lane.
  const [joined, setJoined] = useState<{ lane: number } | null>(null)
  useLayoutEffect(() => {
    if (!joined) return
    // After the Move menu closes, which hands focus back to the card's old handle.
    const frame = requestAnimationFrame(() =>
      bodyRef.current
        ?.querySelectorAll('[data-slot="record-board-lane"]')
        [joined.lane]?.querySelector<HTMLElement>('summary')
        ?.focus()
    )
    return () => cancelAnimationFrame(frame)
  }, [joined])
  const { toggleRow } = frame
  // Shift ranges run down each column in turn, lane by open lane, as the cards read.
  const onToggle = useCallback(
    (id: string, range: boolean) =>
      toggleRow(
        id,
        range,
        (lanes && laneField
          ? lanes
              .filter((lane) => !closed.has(laneKey(laneField, lane)))
              .flatMap((lane) => lane.cells)
          : columns
        ).flatMap((column) => column.rows.map((record) => record.id))
      ),
    [toggleRow, columns, lanes, laneField, closed]
  )
  // Cards have no checkboxes, so the board selects only through Select mode.
  const selecting = useSelectModeLayout(true)
  const group = useId()
  const movable = Boolean(config.onMove) && !selecting
  // Only the grouping fields whose keys differ between the two cells.
  const onMove = (id: string, from: string, to: string) => {
    const record = rows.find((row) => row.id === id)
    if (!record || !field) return
    const changes: Changes = {}
    const [column, lane] = cellKeys(to)
    const [fromColumn, fromLane] = cellKeys(from)
    if (column !== fromColumn) changes[field.key] = column
    if (laneField && lane !== fromLane) {
      changes[laneField.key] = lane
      const index = lanes?.findIndex((one) => one.key === lane) ?? -1
      if (lanes?.[index] && closed.has(laneKey(laneField, lanes[index])))
        setJoined({ lane: index })
    }
    void move(record, changes)
  }
  const cards = (column: Column, lane?: BoardLane) => (
    <BoardCards
      column={column}
      group={group}
      value={cellValue(column, lane)}
      section={lane?.label}
      compact={Boolean(lane)}
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
  )

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
        {lanes && laneField ? (
          <BoardLanes
            bodyRef={bodyRef}
            aria-label={caption}
            aria-busy={frame.busy || undefined}
            columns={columns}
            lanes={lanes}
            field={laneField}
            closed={closed}
            onOpenChange={(key, open) =>
              setClosed((was) => {
                const next = new Set(was)
                if (open) next.delete(key)
                else next.add(key)
                return next
              })
            }
            stickyTop={frame.stickyTop}
            cell={(lane, column) => (
              <div
                key={cellValue(column)}
                role='group'
                aria-label={column.label}
                data-slot='record-board-cell'
                className={columnClass}
              >
                {cards(column, lane)}
              </div>
            )}
          />
        ) : (
          <div
            ref={bodyRef}
            role='group'
            aria-label={caption}
            aria-busy={frame.busy || undefined}
            data-slot='record-board-body'
            className={columnsClass}
          >
            {columns.map((column) => (
              <section
                key={cellValue(column)}
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
                {cards(column)}
              </section>
            ))}
          </div>
        )}
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
  value,
  section,
  compact,
  movable,
  onMove,
  titleOf,
  children
}: {
  column: Column
  group: string
  value: string
  /** The lane's name, so the Move menu offers other lanes as submenus. */
  section?: string
  /** A lane's cell, shorter while empty. */
  compact: boolean
  movable: boolean
  onMove: (id: string, from: string, to: string) => void
  titleOf: (record: Row) => string
  children: (record: Row) => ReactNode
}) {
  const items = useMemo(() => column.rows.map(({ id }) => id), [column.rows])
  return (
    <Sortable
      group={group}
      value={value}
      section={section}
      label={column.label}
      items={items}
      disabled={!movable}
      // Cards keep the view's sort, so only a move to another column counts.
      onReorder={() => {}}
      onTransfer={({ value, from, to }) => onMove(value, from, to)}
    >
      <Sortable.DropZone
        render={<ul role='list' />}
        className={cn(
          'grid content-start gap-2',
          compact ? 'min-h-12' : 'min-h-24'
        )}
      >
        {column.rows.map((record) => (
          <Sortable.Item
            key={record.id}
            value={record.id}
            data-record-id={record.id}
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

/** The fields a board view makes its columns and lanes from: its `groupBy` levels, else the definition's, each when that field can group. */
export function boardGroupFields(
  fields: readonly RecordsField[],
  layout: RecordLayout,
  fallback: string | readonly string[]
): { column?: RecordsField; lane?: RecordsField } {
  const [column, lane] =
    layout.type === 'board'
      ? layout.groupBy
      : typeof fallback === 'string'
        ? [fallback]
        : fallback
  const groupable = groupableFields(fields)
  const find = (key: string | undefined) =>
    fields.find((field) => field.key === key && groupable.includes(field))
  return {
    column: find(column),
    lane: lane === column ? undefined : find(lane)
  }
}

/** The rows with moves applied. */
function placeMoves(
  rows: readonly Row[],
  moves: ReadonlyMap<string, Move>
): readonly Row[] {
  if (!moves.size) return rows
  return rows.map((record) => {
    const move = moves.get(record.id)
    // Once the app hands over a new row, it holds the record's real value.
    if (!move || (!move.pending && move.row !== record.row)) return record
    return { ...record, row: { ...record.row, ...move.changes } }
  })
}

/** Every option's group, then "No <field>" even when empty, so cards can move there. */
function boardGroups(rows: readonly Row[], field: RecordsField): Column[] {
  // A blank option never holds a record, as blank values group under "No <field>".
  const groups = groupRecords(rows, field).filter(({ key }) => key !== '')
  return groups[groups.length - 1]?.key === null
    ? groups
    : [...groups, { key: null, label: noneLabel(field), rows: [] }]
}

/** A lane per option of the field, each holding its share of every column. */
function boardLanes(
  rows: readonly Row[],
  columns: readonly Column[],
  field: RecordsField
): BoardLane[] {
  const laneOf = new Map<string, string | null>()
  const lanes = boardGroups(rows, field)
  for (const lane of lanes)
    for (const record of lane.rows) laneOf.set(record.id, lane.key)
  return lanes.map((lane) => ({
    ...lane,
    cells: columns.map((column) => ({
      ...column,
      rows: column.rows.filter((record) => laneOf.get(record.id) === lane.key)
    }))
  }))
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
  // A fresh object each time, so putting back the same card twice refocuses it.
  const [putBack, setPutBack] = useState<{ id: string } | null>(null)
  const current = useRef(new Map<string, Move>())

  // A later move of the same card replaces this one, which then settles nothing.
  const settle = (id: string, entry: Move, next?: Move) =>
    setMoves((all) => {
      if (all.get(id) !== entry) return all
      const copy = new Map(all)
      if (next) copy.set(id, next)
      else copy.delete(id)
      return copy
    })

  const move = async (record: Row, changes: Changes) => {
    if (!onMove) return
    setError(null)
    // A move still shown, as the app hasn't handed over its row, stays under this one.
    const prior = moves.get(record.id)
    const shown = prior && (prior.pending || prior.row === record.row)
    const entry: Move = {
      changes: shown ? { ...prior.changes, ...changes } : changes,
      row: record.row,
      pending: true
    }
    current.current.set(record.id, entry)
    setMoves((all) => new Map(all).set(record.id, entry))
    try {
      await onMove(record.row as Record<string, unknown>, changes)
      settle(record.id, entry, { ...entry, pending: false })
    } catch (caught) {
      settle(record.id, entry)
      if (current.current.get(record.id) !== entry) return
      current.current.delete(record.id)
      setError(messageOf(caught, `${titleOf(record)} wasn’t moved. Try again.`))
      setPutBack({ id: record.id })
    }
  }

  return { moves, move, error, putBack }
}
