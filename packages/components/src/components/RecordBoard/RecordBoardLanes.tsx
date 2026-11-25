'use client'

import { type CSSProperties, type ReactNode, type Ref, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { surfaceClass, useSurface } from '../../utils/surface'
import { Accordion } from '../Accordion'
import type { RecordGroup } from '../Records/groups'
import type { RecordsField } from '../Records/types'

type Group = RecordGroup<object>
/** A lane's records, and its share of each column's. */
export type BoardLane = Group & { cells: Group[] }

// Every row of columns takes its width from the board, not from itself, so
// the header and each lane line up however far they scroll.
const tracksClass = 'grid auto-cols-(--board-column) grid-flow-col gap-3'
const tracksWidth = cn(
  '[--board-column:85cqi]',
  '@lg/record-board:[--board-column:max(14rem,calc((100cqi_-_(var(--board-columns)_-_1)_*_var(--spacing)_*_3)_/_var(--board-columns)))]'
)
// Lane titles stay at the start of the screen as the columns scroll by.
const startClass = 'sticky start-0 max-w-[100cqi]'

export function BoardLanes({
  columns,
  lanes,
  field,
  closed,
  onOpenChange,
  stickyTop,
  bodyRef,
  cell,
  ...body
}: {
  columns: readonly Group[]
  lanes: readonly BoardLane[]
  /** The field the lanes group by. */
  field: RecordsField
  /** Keys of the collapsed lanes, from `laneKey`. */
  closed: ReadonlySet<string>
  onOpenChange: (key: string, open: boolean) => void
  stickyTop: string
  bodyRef: Ref<HTMLDivElement>
  cell: (lane: BoardLane, column: Group) => ReactNode
  'aria-label'?: string
  'aria-busy'?: boolean
}) {
  const headRef = useRef<HTMLDivElement>(null)
  useSurface(headRef)
  return (
    <div
      ref={bodyRef}
      role='group'
      {...body}
      data-slot='record-board-body'
      className={cn('grid', tracksWidth)}
      style={{ '--board-columns': columns.length } as CSSProperties}
    >
      {/* Outside the sideways scroller, which would hold it from sticking to the page. */}
      <div
        ref={headRef}
        aria-hidden
        data-slot='record-board-head'
        style={{ top: stickyTop }}
        className={cn('sticky z-docked overflow-hidden', surfaceClass)}
      >
        <div className={cn(tracksClass, 'py-1')}>
          {columns.map((column) => (
            <p
              key={column.key ?? ''}
              className='flex gap-1.5 px-2 text-display-ui-6 text-strong'
            >
              {column.label}
              <span className='font-normal text-subtle tabular-nums'>
                {column.rows.length}
              </span>
            </p>
          ))}
        </div>
      </div>
      <div
        data-slot='record-board-lanes'
        onScroll={(event) => {
          const head = headRef.current
          if (head) head.scrollLeft = event.currentTarget.scrollLeft
        }}
        className='snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-2'
      >
        <div className='grid w-max min-w-full gap-3'>
          {lanes.map((lane) => {
            const key = laneKey(field, lane)
            return (
              <Lane
                key={key}
                lane={lane}
                field={field}
                open={!closed.has(key)}
                onOpenChange={(open) => onOpenChange(key, open)}
              >
                {lane.cells.map((column) => cell(lane, column))}
              </Lane>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** A lane's place by its field and value, so another field's lanes never inherit its open state. */
export const laneKey = (field: RecordsField, lane: Group) =>
  JSON.stringify([field.key, lane.key])

function Lane({
  lane,
  field,
  open,
  onOpenChange,
  children
}: {
  lane: BoardLane
  field: RecordsField
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const extra = field.groupHeading?.({
    value: lane.key,
    label: lane.label,
    count: lane.rows.length
  })
  // As the list's groups: the summary holds the title, and heading content,
  // which can hold links, follows it and hides with the lane.
  return (
    <section
      aria-label={lane.label}
      data-slot='record-board-lane'
      className='grid'
    >
      <Accordion.Item
        open={open}
        onToggle={(event) => {
          const now = event.currentTarget.open
          if (now !== open) onOpenChange(now)
        }}
        className='grid gap-2'
      >
        <Accordion.Trigger
          className={cn(startClass, 'w-[100cqi] gap-3 rounded-lg px-2 py-1')}
        >
          <h2 className='flex gap-1.5 text-display-ui-6 text-strong'>
            {lane.label}
            <span className='font-normal text-subtle tabular-nums'>
              {lane.rows.length}
            </span>
          </h2>
        </Accordion.Trigger>
        <Accordion.Content className='grid gap-2 overflow-visible p-0'>
          {extra != null && extra !== false && (
            <div
              data-slot='record-board-lane-heading'
              className={cn(startClass, 'px-2 text-sm text-subtle')}
            >
              {extra}
            </div>
          )}
          <div className={tracksClass}>{children}</div>
        </Accordion.Content>
      </Accordion.Item>
    </section>
  )
}
