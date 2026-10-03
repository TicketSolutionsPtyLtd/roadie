'use client'

import {
  type ReactNode,
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
  type RecordSelection,
  type RecordSort,
  type RecordView,
  type ResolvedRecordQuery,
  compileRecordQuery,
  sortRecords
} from '@oztix/roadie-core/records'

import { isDev } from '../../utils/isDev'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { applyQuery, isFiltered, toView } from './query'
import {
  EMPTY_SELECTION,
  selectedCount as countSelected,
  isSelected,
  sameSelection,
  selectPage as selectPageIds,
  toggle,
  toggleRange,
  withinMatching
} from './selection'
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
  /**
   * Filters the page sets, such as the event a list of tickets belongs to.
   * They filter like the view's but are never part of it, so they are never
   * saved, cleared or edited: `Records.Search` shows them as locked chips.
   */
  scope?: readonly RecordFilter[]
  /** Lets people pick records for bulk actions. @default false */
  selectable?: boolean
  /** Session state, like the position. A search or filter change drops picked records it hides. */
  selection?: RecordSelection
  defaultSelection?: RecordSelection
  onSelectionChange?: (selection: RecordSelection) => void
  /** Menu items for one record, such as `Menu.Item`s, shown in a menu on its row. */
  rowActions?: (row: Row) => ReactNode
  /** The record's page. Return `undefined` for a record with none. */
  getRowHref?: (row: Row) => string | undefined
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
  /** The page's own filters, applied before the view's. */
  scope: readonly RecordFilter[]
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
  /** Every record the search and filters match, sorted, across pages. */
  matchingRows: readonly RecordsRow<Row>[]
  selectable: boolean
  selection: RecordSelection
  /** Selected records the search and filters still match. */
  selectedCount: number
  countSelection: (selection: RecordSelection) => number
  isSelected: (id: string) => boolean
  setSelection: (selection: RecordSelection) => void
  /** `range` selects from the last record toggled to this one, in sorted order. */
  toggleRow: (id: string, options?: { range?: boolean }) => void
  selectPage: (value: boolean) => void
  selectAllMatching: () => void
  clearSelection: () => void
  /** Select mode: taps select records rather than open them, for layouts without checkboxes. Only selectable records enter it. */
  selecting: boolean
  /** Leaving clears the selection, unless `keep`. */
  setSelecting: (value: boolean, options?: { keep?: boolean }) => void
  rowActions?: (row: Row) => ReactNode
  getRowHref?: (row: Row) => string | undefined
  recordName: RecordName
  loading: boolean
  error: boolean | string
  onRetry?: () => void
  timeZone: string
  /** The moment relative dates resolve against. */
  now: Date
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
const NO_SCOPE: readonly RecordFilter[] = []

/**
 * What a selection was taken against: the search and the unresolved filters,
 * in any order, so "today" rolling over doesn't drop it.
 */
const matchKey = ({
  search,
  filters
}: {
  search: string
  filters: readonly RecordFilter[]
}) =>
  JSON.stringify([
    search.trim(),
    filters.map((filter) => JSON.stringify(filter)).sort()
  ])

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
  now,
  scope: scopeOption = NO_SCOPE,
  selectable = false,
  selection: controlledSelection,
  defaultSelection,
  onSelectionChange,
  rowActions,
  getRowHref
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
  const resolvedAt = useMemo(() => new Date(atTime), [atTime])

  // The field paints each keystroke; filtering thousands of rows follows.
  const search = useDeferredValue(view.query.search)
  const filters = useEqualValue(view.query.filters)
  const sort = useEqualValue(view.query.sort)
  const scope = useEqualValue(scopeOption)
  const applied = useMemo(
    () =>
      applyQuery({ search, filters, sort }, fields, {
        now: new Date(atTime),
        timeZone: zone
      }),
    [search, filters, sort, fields, atTime, zone]
  )
  const appliedScope = useMemo(
    () =>
      applyQuery({ search: '', filters: [...scope], sort: [] }, fields, {
        now: new Date(atTime),
        timeZone: zone
      }),
    [scope, fields, atTime, zone]
  )
  const resolvedQuery = useMemo(
    () => ({
      ...applied.resolved,
      filters: [...appliedScope.resolved.filters, ...applied.resolved.filters]
    }),
    [applied, appliedScope]
  )
  const skipped = useMemo(
    () => [
      ...appliedScope.skipped.map((problem) => `scope ${problem}`),
      ...applied.skipped
    ],
    [applied, appliedScope]
  )

  const warned = useRef(new Set<string>())
  useEffect(() => {
    if (!isDev() || skipped.length === 0) return
    const message = `[Roadie] Records skipped part of the view:\n${skipped.join('\n')}`
    if (warned.current.has(message)) return
    warned.current.add(message)
    console.warn(message)
  }, [skipped])

  // Every index a record sits at, so a record listed twice keeps both.
  const indexesOf = useMemo(() => {
    const indexes = new Map<Row, number[]>()
    data.forEach((row, index) => {
      const held = indexes.get(row)
      if (held) held.push(index)
      else indexes.set(row, [index])
    })
    return indexes
  }, [data])
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

  const matchingRows = useMemo(() => {
    // A repeated record sorts with equal keys, so its copies keep their order.
    const seen = new Map<Row, number>()
    return matching.map((row) => {
      const taken = seen.get(row) ?? 0
      seen.set(row, taken + 1)
      return { id: getRowId(row, indexesOf.get(row)?.[taken] ?? 0), row }
    })
  }, [matching, indexesOf, getRowId])
  const matchingIds = useMemo(
    () => matchingRows.map((row) => row.id),
    [matchingRows]
  )
  const start = position.page * position.pageSize
  const rows = matchingRows.slice(start, start + position.pageSize)
  const pageIds = rows.map((row) => row.id)

  const [ownSelection, setOwnSelection] = useState<RecordSelection>(
    defaultSelection ?? EMPTY_SELECTION
  )
  const heldSelection = controlledSelection ?? ownSelection
  const anchor = useRef<string | undefined>(undefined)
  // A pick made here acts on the rows on screen, so it belongs to the applied
  // query, even while a newer search waits to apply.
  const appliedKey = matchKey({ search, filters: [...scope, ...filters] })
  const [picked, setPicked] = useState<{
    selection: RecordSelection
    key: string
  } | null>(null)
  const setSelection = (next: RecordSelection) => {
    setPicked({ selection: next, key: appliedKey })
    if (!controlledSelection) setOwnSelection(next)
    onSelectionChange?.(next)
  }
  const clearSelection = () => {
    anchor.current = undefined
    setSelection(EMPTY_SELECTION)
  }
  const [selectingState, setSelectingState] = useState(false)
  const selecting = selectable && selectingState

  // A selection from outside, like the URL or the parent, keys to the query as
  // set, so one set with a new search keeps it before the search applies.
  const queryKey = matchKey({
    search: view.query.search,
    filters: [...scope, ...filters]
  })
  // A search's matches exist only once it renders, so pruning waits for it.
  const searchApplied = search === view.query.search
  const [taken, setTaken] = useState({
    held: heldSelection,
    key: queryKey,
    selection: heldSelection
  })
  let selection = heldSelection
  // A selection set with its query, like one restored from the URL, keeps it.
  if (!sameSelection(taken.held, heldSelection)) {
    const own =
      picked !== null && sameSelection(picked.selection, heldSelection)
    // Read once: a later outside change that happens to equal it is not ours.
    if (picked !== null) setPicked(null)
    setTaken({
      held: heldSelection,
      key: own ? picked.key : queryKey,
      selection
    })
  } else if (searchApplied && taken.key !== queryKey) {
    // Derived in render, so no paint pairs the old selection with the new query.
    const empty = 'ids' in heldSelection && heldSelection.ids.length === 0
    selection = empty
      ? heldSelection
      : 'allMatching' in heldSelection
        ? EMPTY_SELECTION
        : withinMatching(heldSelection, matchingIds)
    setTaken({ held: heldSelection, key: queryKey, selection })
  } else if (taken.selection !== taken.held) selection = taken.selection
  // Compared by identity: each derivation makes a new record, while the
  // selections inside it can be the same shared EMPTY_SELECTION.
  const notified = useRef<typeof taken | null>(null)
  useEffect(() => {
    if (taken.selection === taken.held || notified.current === taken) return
    notified.current = taken
    // Own state follows and the parent is told, which render can't do.
    setSelection(taken.selection)
  })
  const countSelection = (next: RecordSelection) =>
    countSelected(next, matchingIds)

  // Writes in one event build on each other, as a parent's state won't have
  // rendered between them; the next render starts again from what it shows.
  const written = useRef<RecordView | null>(null)
  useIsomorphicLayoutEffect(() => {
    written.current = null
  })
  const latestView = () => written.current ?? view
  const setView = (
    next: RecordView,
    nextPosition: Required<RecordPosition> = position
  ) => {
    written.current = next
    if (!controlledView) setOwnView(next)
    onViewChange?.(next, nextPosition)
  }
  const setPosition = (next: Required<RecordPosition>) => {
    if (!controlledPosition) setOwnPosition(next)
    onPositionChange?.(next)
  }
  // The position goes first and the view last, carrying the new position, so
  // a parent writing both to one URL ends with the two agreeing.
  const setQuery = (
    query: (current: RecordView['query']) => Partial<RecordView['query']>
  ) => {
    const first = { ...position, page: 0, row: 0 }
    if (position.page !== 0 || position.row !== 0) setPosition(first)
    const base = latestView()
    setView({ ...base, query: { ...base.query, ...query(base.query) } }, first)
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
    filtered: isFiltered(applied.resolved),
    position,
    pageCount,
    setView: (next) => setView(next),
    skippedFilters: applied.skippedFilters,
    scope,
    setSearch: (next) => setQuery(() => ({ search: next })),
    addFilter: (filter) =>
      setQuery((query) => ({ filters: [...query.filters, filter] })),
    updateFilter: (index, filter) =>
      setQuery((query) => ({
        filters: query.filters.map((current, at) =>
          at === index ? filter : current
        )
      })),
    removeFilter: (index) =>
      setQuery((query) => ({
        filters: query.filters.filter((_, at) => at !== index)
      })),
    clearQuery: () => setQuery(() => ({ search: '', filters: [] })),
    setSort: (next) => setQuery(() => ({ sort: next })),
    setLayout: (layout) => setView({ ...latestView(), layout }),
    setPage: (page) => {
      const next = Math.max(0, Math.min(page, lastPage))
      if (next !== position.page)
        setPosition({ ...position, page: next, row: 0 })
    },
    setPageSize: (pageSize) => setPosition({ page: 0, pageSize, row: 0 }),
    matchingRows,
    selectable,
    selection,
    selectedCount: countSelection(selection),
    countSelection,
    isSelected: (id) => isSelected(selection, id),
    setSelection,
    toggleRow: (id, { range = false } = {}) => {
      const value = !isSelected(selection, id)
      setSelection(
        range
          ? toggleRange(selection, matchingIds, anchor.current, id, value)
          : toggle(selection, id, value)
      )
      anchor.current = id
    },
    selectPage: (value) =>
      setSelection(selectPageIds(selection, pageIds, value)),
    selectAllMatching: () => setSelection({ allMatching: true, except: [] }),
    clearSelection,
    selecting,
    setSelecting: (value, { keep = false } = {}) => {
      if (value && !selectable) return
      if (!value && !keep) clearSelection()
      setSelectingState(value)
    },
    rowActions,
    getRowHref,
    recordName,
    loading,
    error,
    onRetry,
    timeZone: zone,
    now: resolvedAt
  }
}
