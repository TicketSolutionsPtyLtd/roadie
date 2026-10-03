'use client'

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { type Instantish, viewerTimeZone } from '@oztix/roadie-core/datetime'
import {
  type RecordField,
  type RecordFilter,
  type RecordLayout,
  type RecordPosition,
  type RecordSort,
  type RecordView,
  type ResolvedRecordQuery,
  compileRecordQuery,
  sortRecords
} from '@oztix/roadie-core/records'

import { isDev } from '../../utils/isDev'
import { applyQuery, isFiltered, toView } from './query'
import type { RecordName, RecordViewDefaults, RecordsRow } from './types'

export type UseRecordsOptions<Row extends object> = {
  /** Every record. Records filters, sorts and pages them in the browser. */
  data: readonly Row[]
  /** What each record holds. Keep the array stable (module scope or `useMemo`). */
  fields: readonly RecordField[]
  /** Defaults to the record's index in `data`. */
  getRowId?: (row: Row, index: number) => string
  view?: RecordView
  defaultView?: RecordViewDefaults
  /** Gets the position too: a change to the search, filters or sort returns to the first page, and `onPositionChange` hears that first. */
  onViewChange?: (view: RecordView, position: Required<RecordPosition>) => void
  /** Page and page size: session state, never part of a view. */
  position?: RecordPosition
  defaultPosition?: RecordPosition
  onPositionChange?: (position: Required<RecordPosition>) => void
  /** @default { one: 'record', other: 'records' } */
  recordName?: RecordName
  /** A fetch is under way. With no records the layout shows placeholders; with records it dims them. */
  loading?: boolean
  /** The fetch failed. A string is shown as the message. */
  error?: boolean | string
  /** Shows a Retry button beside the error. */
  onRetry?: () => void
  /** The viewer's IANA zone: it decides what "today" is and how timestamps read. Defaults to the browser's. */
  timeZone?: string
  /** The moment relative dates resolve against. Defaults to when the list mounted. */
  now?: Instantish
}

export type RecordsInstance<Row extends object = object> = {
  mode: 'browser'
  /** Every record held, before search, filters and paging. */
  data: readonly Row[]
  fields: readonly RecordField[]
  view: RecordView
  /** The view the rows show: the search lags typing while thousands of rows filter. */
  appliedView: RecordView
  resolvedQuery: ResolvedRecordQuery
  /** The current page. */
  rows: readonly RecordsRow<Row>[]
  resultCount: number
  /** A search or filter narrows the records. */
  filtered: boolean
  position: Required<RecordPosition>
  pageCount: number
  setView: (view: RecordView) => void
  /** Filters in the view, by index, that these fields can't apply, so they filter nothing. */
  skippedFilters: readonly number[]
  setSearch: (search: string) => void
  addFilter: (filter: RecordFilter) => void
  updateFilter: (index: number, filter: RecordFilter) => void
  removeFilter: (index: number) => void
  /** Clears the search and filters, keeping the sort and layout. */
  clearQuery: () => void
  setSort: (sort: RecordSort[]) => void
  setLayout: (layout: RecordLayout) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  recordName: RecordName
  loading: boolean
  error: boolean | string
  onRetry?: () => void
  timeZone: string
}

const RECORD: RecordName = { one: 'record', other: 'records' }
const PAGE_SIZE = 50
const indexId = (_: unknown, index: number) => String(index)
const noSubscription = () => () => {}

const whole = (value: number | undefined, min: number, fallback: number) =>
  value === undefined || !Number.isFinite(value)
    ? fallback
    : Math.max(min, Math.floor(value))

/** The last value equal by content, so a new but equal object keeps memos. */
function useEqualValue<T>(value: T): T {
  const [held, setHeld] = useState(value)
  if (held === value) return held
  if (JSON.stringify(held) === JSON.stringify(value)) return held
  setHeld(value)
  return value
}
const serverZone = () => 'UTC'

export function useRecords<Row extends object>({
  data,
  fields,
  getRowId = indexId,
  view: controlledView,
  defaultView,
  onViewChange,
  position: controlledPosition,
  defaultPosition,
  onPositionChange,
  recordName = RECORD,
  loading = false,
  error = false,
  onRetry,
  timeZone,
  now
}: UseRecordsOptions<Row>): RecordsInstance<Row> {
  const [ownView, setOwnView] = useState(() => toView(defaultView))
  const view = controlledView ?? ownView
  const [ownPosition, setOwnPosition] = useState(defaultPosition ?? {})
  const heldPosition = controlledPosition ?? ownPosition
  const position = {
    page: whole(heldPosition.page, 0, 0),
    pageSize: whole(heldPosition.pageSize, 1, PAGE_SIZE),
    row: whole(heldPosition.row, 0, 0)
  }
  // The server can't know the viewer's zone, so it renders UTC and hydration
  // moves to the viewer's.
  const viewerZone = useSyncExternalStore(
    noSubscription,
    viewerTimeZone,
    serverZone
  )
  const zone = timeZone ?? viewerZone
  const [mounted] = useState(() => new Date())
  const at = now ?? mounted
  const atTime = at instanceof Date ? at.getTime() : at.epochMilliseconds

  // The field paints each keystroke; filtering thousands of rows follows.
  const search = useDeferredValue(view.query.search)
  const filters = useEqualValue(view.query.filters)
  const sort = useEqualValue(view.query.sort)
  const applied = useMemo(
    () =>
      applyQuery({ search, filters, sort }, fields, {
        now: new Date(atTime),
        timeZone: zone
      }),
    [search, filters, sort, fields, atTime, zone]
  )
  const resolvedQuery = applied.resolved

  const warned = useRef(new Set<string>())
  useEffect(() => {
    if (!isDev() || applied.skipped.length === 0) return
    const message = `[Roadie] Records skipped part of the view:\n${applied.skipped.join('\n')}`
    if (warned.current.has(message)) return
    warned.current.add(message)
    console.warn(message)
  }, [applied.skipped])

  const indexOf = useMemo(
    () => new Map(data.map((row, index) => [row, index])),
    [data]
  )
  const matching = useMemo(() => {
    const matches = compileRecordQuery(resolvedQuery, fields)
    return sortRecords(data.filter(matches), resolvedQuery.sort, fields, {
      timeZone: zone
    })
  }, [data, resolvedQuery, fields, zone])

  const resultCount = matching.length
  const pageCount = Math.max(1, Math.ceil(resultCount / position.pageSize))
  const lastPage = pageCount - 1
  // A count from a pending or failed fetch would wipe a deep-linked page.
  const outOfRange = !loading && !error && position.page > lastPage
  // Clamped during render, not in an effect, so the stale page never paints.
  if (!controlledPosition && outOfRange)
    setOwnPosition({ ...position, page: lastPage })
  // A controlled position belongs to the parent, so the clamp is only reported.
  const clampedPage = outOfRange ? lastPage : undefined
  const { pageSize, row } = position
  const controlled = controlledPosition !== undefined
  useEffect(() => {
    if (controlled && clampedPage !== undefined)
      onPositionChange?.({ page: clampedPage, pageSize, row })
  }, [controlled, clampedPage, pageSize, row, onPositionChange])

  const start = position.page * position.pageSize
  const rows = matching
    .slice(start, start + position.pageSize)
    .map((row) => ({ id: getRowId(row, indexOf.get(row) ?? 0), row }))

  const setView = (
    next: RecordView,
    nextPosition: Required<RecordPosition> = position
  ) => {
    if (!controlledView) setOwnView(next)
    onViewChange?.(next, nextPosition)
  }
  const setPosition = (next: Required<RecordPosition>) => {
    if (!controlledPosition) setOwnPosition(next)
    onPositionChange?.(next)
  }
  // The position goes first and the view last, carrying the new position, so
  // a parent writing both to one URL ends with the two agreeing.
  const setQuery = (query: Partial<RecordView['query']>) => {
    const first = { ...position, page: 0, row: 0 }
    if (position.page !== 0 || position.row !== 0) setPosition(first)
    setView({ ...view, query: { ...view.query, ...query } }, first)
  }

  return {
    mode: 'browser',
    data,
    fields,
    view,
    appliedView:
      search === view.query.search
        ? view
        : { ...view, query: { ...view.query, search } },
    resolvedQuery,
    rows,
    resultCount,
    filtered: isFiltered(resolvedQuery),
    position,
    pageCount,
    setView: (next) => setView(next),
    skippedFilters: applied.skippedFilters,
    setSearch: (next) => setQuery({ search: next }),
    addFilter: (filter) => setQuery({ filters: [...filters, filter] }),
    updateFilter: (index, filter) =>
      setQuery({
        filters: filters.map((current, at) => (at === index ? filter : current))
      }),
    removeFilter: (index) =>
      setQuery({ filters: filters.filter((_, at) => at !== index) }),
    clearQuery: () => setQuery({ search: '', filters: [] }),
    setSort: (next) => setQuery({ sort: next }),
    setLayout: (layout) => setView({ ...view, layout }),
    setPage: (page) => {
      const next = Math.max(0, Math.min(page, lastPage))
      if (next !== position.page)
        setPosition({ ...position, page: next, row: 0 })
    },
    setPageSize: (pageSize) => setPosition({ page: 0, pageSize, row: 0 }),
    recordName,
    loading,
    error,
    onRetry,
    timeZone: zone
  }
}
