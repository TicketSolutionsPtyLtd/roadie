'use client'

import {
  type ReactNode,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
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
  type RecordQuery,
  type RecordSelection,
  type RecordSort,
  type RecordView,
  type ResolvedRecordQuery,
  compileRecordQuery,
  equalViews,
  sortRecords
} from '@oztix/roadie-core/records'

import { isDev } from '../../utils/isDev'
import { applyQuery, isFiltered, toView } from './query'
import { MAX_RANGE_ROWS, type RecordsRange, rangeKey } from './ranges'
import {
  EMPTY_SELECTION,
  selectedCount as countSelected,
  isSelected,
  matchKey,
  sameSelection,
  selectPage as selectPageIds,
  toggle,
  toggleRange,
  withinMatching
} from './selection'
import type {
  RecordName,
  RecordViewDefaults,
  RecordsRangeState,
  RecordsRow
} from './types'
import { useRangeLoading } from './useRangeLoading'

export type UseRecordsOptions<Row extends object> = {
  /** Every record, which Records filters, sorts and pages in the browser. With `rowCount`, the page the server returned. With `loadRange`, the records loaded so far, each at its index, with gaps left undefined (`placeRange` puts a range in place). */
  data: readonly (Row | undefined)[]
  /**
   * How many records the search and filters match on the server. Giving it turns on server mode: `data` is one page, already searched, filtered, sorted and paged, and the search waits for a pause in typing. Fetch `scopedQuery` at `position` in `timeZone`. Once given, server mode stays: an `undefined` count keeps the last one. Pass 0 until the first count arrives.
   */
  rowCount?: number
  /** What each record holds. Keep the array stable (module scope or `useMemo`). */
  fields: readonly RecordField[]
  /** Defaults to the record's index in `data`. Selecting in server or range mode needs it, as index ids repeat on every page and a refetch. */
  getRowId?: (row: Row, index: number) => string
  view?: RecordView
  defaultView?: RecordViewDefaults
  /** Gets the position too: a change to the search, filters or sort returns to the first page, and `onPositionChange` hears that first. */
  onViewChange?: (view: RecordView, position: Required<RecordPosition>) => void
  /**
   * The saved or preset view the screen opened, so `modified` can tell when
   * the view moves away from it and `resetView` can go back. Leave it out
   * when no saved view is open.
   */
  baseline?: RecordView
  /** Page, page size and, in range mode, the first row on screen: session state, never part of a view. */
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
  /** The moment relative dates resolve against. Defaults to when the list mounted in the browser: a server reads no clock, so a relative date filter shows the loading state until then. */
  now?: Instantish
  /**
   * Filters the page sets, such as the event a list of tickets belongs to.
   * They filter like the view's but are never part of it, so they are never
   * saved, cleared or edited: `Records.Search` shows them as locked chips.
   * In server mode they reach the fetch through `scopedQuery`.
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
  /**
   * Turns on range mode: one long list, searched, filtered and sorted on the server, that loads the records on screen as people scroll. Each range is one page of `pageSize` records, `end` exclusive, so it starts at `page * pageSize`. Put the records in `data` at their index with `placeRange`, then resolve. With `rowCount` the list is that long from the start; without it, ranges load one after another until one comes back short. A rejection shows the range's error with Retry.
   */
  loadRange?: (range: RecordsRange) => Promise<void> | void
}

export type RecordsInstance<Row extends object = object> = {
  /** `server` once `rowCount` is given, `range` once `loadRange` is. */
  mode: 'browser' | 'server' | 'range'
  /** Every record held, before search, filters and paging; in server mode, the page; in range mode, the records loaded, in order. */
  data: readonly Row[]
  fields: readonly RecordField[]
  view: RecordView
  /** The view the rows show, without the filters and sorts these fields can't apply, and without the page's `scope`. In the browser its search lags typing while thousands of rows filter. It and its `query` keep their identity while their content holds. Key a fetch on `query`, the position and `timeZone`, as relative dates resolve in the zone, which moves from UTC to the viewer's after hydration. */
  appliedView: RecordView
  /** The applied view's query with the page's `scope` first: what to fetch in server mode, and what actions act on. It keeps its identity while its content holds. */
  scopedQuery: RecordQuery
  /** What the search field shows. In server mode it runs ahead of the view's search until typing pauses. */
  searchText: string
  resolvedQuery: ResolvedRecordQuery
  /** The current page; in range mode, every record loaded. */
  rows: readonly RecordsRow<Row>[]
  resultCount: number
  /** A search or filter narrows the records. */
  filtered: boolean
  position: Required<RecordPosition>
  pageCount: number
  setView: (view: RecordView) => void
  /** The saved or preset view the screen opened. */
  baseline: RecordView | undefined
  /** The view shows something other than its `baseline`, by `equalViews`. Always false without one. */
  modified: boolean
  /** Goes back to the `baseline` from the first page. Does nothing without one. */
  resetView: () => void
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
  /** Range mode: reports the first row on screen as `position.row`, when it changed and something keeps it. */
  setRow: (row: number) => void
  /** Range mode's loading state, for a layout to render rows at their index. Undefined in other modes. */
  range?: RecordsRangeState<Row>
  /** Every record the search and filters match, sorted, across pages. In server mode, only the page held. */
  matchingRows: readonly RecordsRow<Row>[]
  selectable: boolean
  selection: RecordSelection
  /** Selected records the search and filters still match. In server mode, the ids picked, or `rowCount` less the exceptions. */
  selectedCount: number
  /** How many records a selection holds, counted as `selectedCount` is. */
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
  /** The moment relative dates resolve against. The Unix epoch on the server and while hydrating, when no `now` is given, as the browser's clock isn't read until then. */
  now: Date
}

const RECORD: RecordName = { one: 'record', other: 'records' }
const PAGE_SIZE = 50
// Long enough to sit between keystrokes, so a request leaves once per pause.
const SEARCH_DEBOUNCE_MS = 250
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
const noClock = () => null
const NO_SCOPE: readonly RecordFilter[] = []

export function useRecords<Row extends object>({
  data,
  rowCount,
  fields,
  getRowId = indexId,
  view: controlledView,
  defaultView,
  onViewChange,
  baseline,
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
  getRowHref,
  loadRange
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
  // Nor can it read the clock, as a prerender would freeze it, so the clock
  // is read in the browser, once, unless `now` is given.
  const [readClock] = useState(() => {
    let mounted: Date | undefined
    return () => (mounted ??= new Date())
  })
  const clock = useSyncExternalStore(
    noSubscription,
    now === undefined ? readClock : noClock,
    noClock
  )
  const at = now ?? clock
  const atTime =
    at === null ? 0 : at instanceof Date ? at.getTime() : at.epochMilliseconds
  const resolvedAt = useMemo(() => new Date(atTime), [atTime])

  // A page that loads without a count keeps the last one, so the records
  // don't fall back to the browser and prune the selection or the page.
  const [lastCount, setLastCount] = useState(rowCount)
  if (rowCount !== undefined && !Object.is(rowCount, lastCount))
    setLastCount(rowCount)
  const count = rowCount ?? lastCount
  const ranged = loadRange !== undefined
  const server = count !== undefined || ranged
  // The field paints each keystroke; filtering thousands of rows follows. A
  // server's search already waited for typing to pause.
  const deferredSearch = useDeferredValue(view.query.search)
  const search = server ? view.query.search : deferredSearch
  const filters = useEqualValue(view.query.filters)
  const sort = useEqualValue(view.query.sort)
  const scope = useEqualValue(scopeOption)
  // A relative date filter's rows wait for the browser's clock.
  const awaitingClock =
    at === null &&
    !server &&
    [...filters, ...scope].some((filter) => filter.operator === 'within')
  const busy = loading || awaitingClock
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
  const appliedQuery = useEqualValue(
    useMemo(() => {
      const skipped = new Set(applied.skippedFilters)
      return {
        search,
        filters: filters.filter((_, index) => !skipped.has(index)),
        sort: applied.resolved.sort
      }
    }, [search, filters, applied])
  )
  const appliedView = useEqualValue(
    useMemo(() => ({ ...view, query: appliedQuery }), [view, appliedQuery])
  )
  const scopedFilters = useEqualValue(
    useMemo(() => {
      const skippedScope = new Set(appliedScope.skippedFilters)
      return scope.filter((_, index) => !skippedScope.has(index))
    }, [appliedScope, scope])
  )
  const scopedQuery = useMemo(
    () =>
      scopedFilters.length === 0
        ? appliedQuery
        : {
            ...appliedQuery,
            filters: [...scopedFilters, ...appliedQuery.filters]
          },
    [appliedQuery, scopedFilters]
  )

  // The records held, gaps left out, each with its index in `data`.
  const loaded = useMemo(() => {
    const rows: Row[] = []
    const at: number[] = []
    data.forEach((row, index) => {
      if (row === undefined) return
      rows.push(row)
      at.push(index)
    })
    // Without gaps, `data` itself, as the consumer passed it.
    return {
      rows: rows.length === data.length ? (data as readonly Row[]) : rows,
      at
    }
  }, [data])
  // Every index a record sits at, so a record listed twice keeps both.
  const indexesOf = useMemo(() => {
    const indexes = new Map<Row, number[]>()
    loaded.rows.forEach((row, k) => {
      const index = loaded.at[k]!
      const held = indexes.get(row)
      if (held) held.push(index)
      else indexes.set(row, [index])
    })
    return indexes
  }, [loaded])
  const matching = useMemo(() => {
    if (server) return loaded.rows
    if (awaitingClock) return []
    const matches = compileRecordQuery(resolvedQuery, fields)
    return sortRecords(
      loaded.rows.filter(matches),
      resolvedQuery.sort,
      fields,
      {
        timeZone: zone
      }
    )
  }, [server, awaitingClock, loaded, resolvedQuery, fields, zone])

  // A new page size starts over, as pages asked for at the old one would block it.
  const key = `${rangeKey(scopedQuery, zone)}@${position.pageSize}`
  const range = useRangeLoading({
    loadRange,
    key,
    rowCount: count === undefined ? undefined : whole(count, 0, 0),
    size: position.pageSize,
    data,
    held: loaded.rows.length
  })

  const rangeCapped = ranged && range.capped

  const warned = useRef(new Set<string>())
  const unidentified =
    count !== undefined && !ranged && selectable && getRowId === indexId
  const rangeUnidentified = ranged && getRowId === indexId
  const rangePaged =
    ranged && heldPosition.page !== undefined && heldPosition.page > 0
  const countCapped = ranged && count !== undefined && count > MAX_RANGE_ROWS
  useEffect(() => {
    if (!isDev()) return
    const warn = (message: string) => {
      if (warned.current.has(message)) return
      warned.current.add(message)
      console.warn(message)
    }
    if (skipped.length > 0)
      warn(`[Roadie] Records skipped part of the view:\n${skipped.join('\n')}`)
    if (unidentified)
      warn(
        '[Roadie] Records in server mode need getRowId to select: index ids repeat on every page.'
      )
    if (rangeUnidentified)
      warn(
        '[Roadie] Records with loadRange need getRowId, so a selection survives refetching.'
      )
    if (rangePaged)
      warn(
        '[Roadie] Records with loadRange ignore the page: the list scrolls, and position.row keeps the place.'
      )
    if (countCapped || rangeCapped)
      warn(
        '[Roadie] Records with loadRange stop at 300,000 rows. Filter the list or use paged server mode.'
      )
  }, [
    skipped,
    unidentified,
    rangeUnidentified,
    rangePaged,
    countCapped,
    rangeCapped
  ])

  const resultCount = ranged
    ? (range.total ?? loaded.rows.length)
    : server
      ? whole(count, 0, 0)
      : matching.length
  // A range list is one long page.
  const pageCount = ranged
    ? 1
    : Math.max(1, Math.ceil(resultCount / position.pageSize))
  const lastPage = pageCount - 1
  // A count from a pending or failed fetch would wipe a deep-linked page.
  const outOfRange = !ranged && !busy && !error && position.page > lastPage
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
  const byIndex = useMemo(
    () =>
      ranged
        ? new Map(loaded.at.map((index, k) => [index, matchingRows[k]!]))
        : undefined,
    [ranged, loaded.at, matchingRows]
  )
  // Stable between loads, so the window and its memoised rows hold while scrolling.
  const rangeState = useMemo<RecordsRangeState<Row> | undefined>(
    () =>
      byIndex
        ? {
            key,
            count: range.count,
            total: range.total,
            loading: range.loading,
            failed: range.failed,
            retry: range.retry,
            rowAt: (index) => byIndex.get(index),
            show: range.view
          }
        : undefined,
    [
      byIndex,
      key,
      range.count,
      range.total,
      range.loading,
      range.failed,
      range.retry,
      range.view
    ]
  )
  const matchingIds = useMemo(
    () => matchingRows.map((row) => row.id),
    [matchingRows]
  )
  // A controlled page the parent never clamped shows the last page, as
  // Records.Pagination reads it.
  const start = Math.min(position.page, lastPage) * position.pageSize
  const rows = server
    ? matchingRows
    : matchingRows.slice(start, start + position.pageSize)
  const pageIds = rows.map((row) => row.id)

  const [ownSelection, setOwnSelection] = useState<RecordSelection>(
    defaultSelection ?? EMPTY_SELECTION
  )
  const heldSelection = controlledSelection ?? ownSelection
  const anchor = useRef<string | undefined>(undefined)
  // A pick made here acts on the rows on screen, so it belongs to the applied
  // query, even while a newer search waits to apply.
  const appliedKey = matchKey(scopedQuery)
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
    filters: scopedQuery.filters
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
    // Only the server knows what a new search matches.
    selection = empty
      ? heldSelection
      : server || 'allMatching' in heldSelection
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
  const countSelection = useMemo(
    () =>
      server
        ? (next: RecordSelection) =>
            'allMatching' in next
              ? Math.max(0, resultCount - new Set(next.except).size)
              : new Set(next.ids).size
        : (next: RecordSelection) => countSelected(next, matchingIds),
    [server, resultCount, matchingIds]
  )
  const selectedCount = useMemo(
    () => countSelection(selection),
    [countSelection, selection]
  )

  // A server's search waits for typing to pause, so the field shows a draft.
  const committed = view.query.search
  const [draft, setDraft] = useState(committed)
  const [seen, setSeen] = useState(committed)
  // Searches sent and not yet seen back, oldest first, so a slow parent's
  // late echo of an earlier one isn't read as a change from outside.
  const [sent, setSent] = useState<readonly string[]>([])
  // Bumped by each search set from outside, which voids a pending draft.
  const [outside, setOutside] = useState(0)
  if (server && committed !== seen) {
    setSeen(committed)
    const echo = sent.indexOf(committed)
    if (echo !== -1) setSent(sent.slice(echo + 1))
    else {
      // A search set from outside, like a reset or the URL, replaces the draft.
      setDraft(committed)
      setSent([])
      setOutside(outside + 1)
    }
  } else if (server && sent.length > 0 && committed === sent.at(-1))
    // The parent holds the last search sent, so earlier ones it skipped
    // can't echo back and mask a later change from outside.
    setSent([])
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(searchTimer.current), [])
  // What the parent will hold once every search sent has echoed.
  const expected = server ? (sent.at(-1) ?? committed) : committed
  const replaceDraft = (next: string) => {
    clearTimeout(searchTimer.current)
    if (!server) return
    setDraft(next)
    if (next !== expected) setSent((held) => [...held, next].slice(-20))
  }

  // Writes build on each other until the view shown changes, as a parent's
  // state may commit late (a transition, a URL). A parent that renders twice
  // without showing a write turned it down, so the next one starts afresh.
  const written = useRef<{ base: RecordView; next: RecordView } | null>(null)
  const writes = useRef(0)
  const writesSeen = useRef(0)
  useEffect(() => {
    if (writes.current === writesSeen.current) written.current = null
    writesSeen.current = writes.current
  })
  // By content, as a parent rendering for another reason may rebuild the view.
  const latestView = () =>
    written.current &&
    (written.current.base === view ||
      JSON.stringify(written.current.base) === JSON.stringify(view))
      ? written.current.next
      : view
  const setView = (
    next: RecordView,
    nextPosition: Required<RecordPosition> = position
  ) => {
    written.current = { base: view, next }
    writes.current++
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
  const resetTo = (next: RecordView) => {
    replaceDraft(next.query.search)
    const first = { ...position, page: 0, row: 0 }
    if (position.page !== 0 || position.row !== 0) setPosition(first)
    setView(next, first)
  }
  const commitSearch = (next: string) => {
    replaceDraft(next)
    if (next !== expected) setQuery(() => ({ search: next }))
  }
  // The timer fires after renders its closure never saw.
  const latest = useRef({ commitSearch, outside, server })
  useLayoutEffect(() => {
    latest.current = { commitSearch, outside, server }
  })
  // Reads the latest render, so a setSearch kept from an older one still works.
  const setSearch = (next: string) => {
    if (!latest.current.server || next === '')
      return latest.current.commitSearch(next)
    setDraft(next)
    clearTimeout(searchTimer.current)
    const base = latest.current.outside
    searchTimer.current = setTimeout(() => {
      // A search set from outside while typing paused wins over the draft,
      // even one that has since changed back; the records' own echo doesn't.
      if (latest.current.outside === base) latest.current.commitSearch(next)
    }, SEARCH_DEBOUNCE_MS)
  }

  return {
    mode: ranged ? 'range' : server ? 'server' : 'browser',
    data: loaded.rows,
    fields,
    view,
    appliedView,
    searchText: server ? draft : committed,
    resolvedQuery,
    rows,
    resultCount,
    filtered: isFiltered(applied.resolved),
    position,
    pageCount,
    setView: (next) => {
      replaceDraft(next.query.search)
      setView(next)
    },
    baseline: baseline ?? undefined,
    modified: baseline != null && !equalViews(view, baseline),
    resetView: () => {
      if (baseline) resetTo(baseline)
    },
    skippedFilters: applied.skippedFilters,
    scope,
    scopedQuery,
    setSearch,
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
    clearQuery: () => {
      replaceDraft('')
      setQuery(() => ({ search: '', filters: [] }))
    },
    setSort: (next) => setQuery(() => ({ sort: next })),
    setLayout: (layout) => setView({ ...latestView(), layout }),
    setPage: (page) => {
      const next = Math.max(0, Math.min(page, lastPage))
      if (next !== position.page)
        setPosition({ ...position, page: next, row: 0 })
    },
    setPageSize: (pageSize) => setPosition({ page: 0, pageSize, row: 0 }),
    setRow: (row) => {
      const next = whole(row, 0, 0)
      if (next === position.row || (!controlledPosition && !onPositionChange))
        return
      setPosition({ ...position, row: next })
    },
    range: rangeState,
    matchingRows,
    selectable,
    selection,
    selectedCount,
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
    loading: busy,
    // Once records have loaded, a failed range shows in place of its rows.
    error:
      error || (ranged && range.failed.length > 0 && loaded.rows.length === 0),
    onRetry: ranged
      ? () => {
          range.retry()
          onRetry?.()
        }
      : onRetry,
    timeZone: zone,
    now: resolvedAt
  }
}
