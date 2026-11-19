'use client'

import { useCallback, useLayoutEffect, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Progress } from '../Progress'
import { RecordsEmpty, RecordsError } from './RecordsStates'
import { useRecordsContext } from './context'
import type { RecordsContentProps } from './layouts'
import { VIRTUALISE_AFTER } from './recordsWindow'
import { useLeaveSelectOnEscape } from './selectMode'
import { useStickyTop } from './stickyTop'
import { useKeepFocusInTable } from './tableFocus'
import { useSurvivor } from './useBulkActions'
import type { RecordsState } from './useRecords'

/** What shows in place of the records, if anything. */
export type RecordsLayoutStateKind = 'error' | 'loading' | 'empty'

/**
 * The frame every layout's content builds on: the box, the sticky top, Select
 * mode's Escape, the rows' survivor, the state in place of the records, and
 * which window holds them.
 */
export function useRecordsLayout({
  fill = false,
  maxHeight
}: Pick<RecordsContentProps, 'fill' | 'maxHeight'>) {
  const context = useRecordsContext()
  const { records, toolbar, setContentFill } = context
  const leaveSelect = useLeaveSelectOnEscape()
  const rowsSurvivor = useSurvivor('rows')
  const frameRef = useRef<HTMLDivElement>(null)
  const boxed = fill || Boolean(maxHeight)
  const stickyTop = useStickyTop(frameRef, toolbar, boxed)
  useLayoutEffect(() => {
    setContentFill(fill)
    return () => setContentFill(false)
  }, [fill, setContentFill])

  const latest = useRef(records)
  useLayoutEffect(() => {
    latest.current = records
  })
  // Stable, so a selection change or an inline rowActions leaves other records alone.
  const toggleRow = useCallback(
    (id: string, range: boolean) => latest.current.toggleRow(id, { range }),
    []
  )
  const rowActions = useCallback(
    (row: object) => latest.current.rowActions?.(row),
    []
  )

  const { rows, range } = records
  const busy = records.loading && !records.error
  // Range mode keeps its records bright: placeholders already show what loads.
  const dimmed = busy && !range && rows.length > 0
  const empty = range ? range.count === 0 : rows.length === 0
  const state: RecordsLayoutStateKind | undefined = records.error
    ? 'error'
    : busy && !range && rows.length === 0
      ? 'loading'
      : empty
        ? 'empty'
        : undefined
  const shownPage = Math.min(records.position.page, records.pageCount - 1)
  const windowed = range
    ? ('range' as const)
    : rows.length > VIRTUALISE_AFTER
      ? ('rows' as const)
      : undefined

  return {
    ...context,
    frameRef,
    boxed,
    stickyTop,
    /** Spread on the frame element, which the layout's own refs measure. */
    frameProps: {
      ref: frameRef,
      'data-records-content': '',
      onKeyDown: leaveSelect
    },
    rowsSurvivor,
    scrollerClass: cn(
      'isolate outline-none',
      boxed && 'grid grow items-start',
      dimmed && 'opacity-60'
    ),
    toggleRow,
    rowActions: records.rowActions ? rowActions : undefined,
    isSelected: records.selectable ? records.isSelected : undefined,
    busy,
    dimmed,
    state,
    windowed,
    /** One-based, the first record on the shown page. */
    firstIndex: shownPage * records.position.pageSize + 1,
    /** Only some records are in the DOM, so each carries its place. */
    partial: windowed !== undefined || records.pageCount > 1
  }
}

/** The error or empty state in place of the records, keeping focus with them when its button goes. Key it by its kind, so one replacing another hands focus on. */
export function RecordsLayoutState({
  kind,
  records
}: {
  kind: Exclude<RecordsLayoutStateKind, 'loading'>
  records: RecordsState
}) {
  const ref = useRef<HTMLDivElement>(null)
  useKeepFocusInTable(ref)
  return (
    <div ref={ref} className='grid content-center self-stretch'>
      {kind === 'error' ? (
        <RecordsError records={records} />
      ) : (
        <RecordsEmpty records={records} />
      )}
    </div>
  )
}

export function RecordsProgress() {
  return (
    <Progress value={null}>
      <Progress.Track className='h-0.5 rounded-none bg-transparent'>
        <Progress.Indicator />
      </Progress.Track>
    </Progress>
  )
}

/** Zero height, so the records don't move; sticks under the toolbar. */
export function RecordsStickyProgress({
  slot,
  top
}: {
  slot: string
  top: string
}) {
  return (
    <div
      aria-hidden
      data-slot={slot}
      style={{ top }}
      className='pointer-events-none sticky z-docked h-0'
    >
      <div className='absolute inset-x-0 top-0'>
        <RecordsProgress />
      </div>
    </div>
  )
}
