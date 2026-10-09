import type { RecordsRangeState, RecordsRow } from './types'

/** Past this many rows, only those near the screen render. */
export const VIRTUALISE_AFTER = 100

/** A row the virtualiser placed; `start` and `end` include the scroll margin. */
export type WindowItem = { index: number; start: number; end: number }

/** Where the window sits, as its hook measures it. */
export type WindowView = {
  items: readonly WindowItem[]
  /** Px of every row. */
  total: number
  /** The body's offset within its scroll element. */
  margin: number
  /** The scroll element's offset. */
  offset: number
  /** The px a stuck header covers at the scroll element's top. */
  inset: number
  /** The first row on screen, ignoring the header. */
  visibleStart?: number
  /** Rows of a known height, so the body can hold their total. */
  fixed: boolean
}

type RangeRecords = Pick<
  RecordsRangeState,
  'key' | 'count' | 'failed' | 'rowAt'
>

export type WindowRecords = (
  { rows: readonly RecordsRow<object>[] } | { range: RangeRecords }
) & {
  /** Records in each window row, as in a grid. */
  columns?: number
}

export type WindowCell = {
  key: string
  /** The record's index. */
  index: number
  /** The window row it sits in. */
  row: number
  /** First in its row, so it takes the row's measuring ref. */
  leads: boolean
  /** Undefined while loading or failed. */
  record?: RecordsRow<object>
  /** In a failed range: the one place showing its error, or a blank. */
  failed?: 'error' | 'blank'
}

/** The first row not hidden under the header. */
export function firstVisibleRow(
  items: readonly Pick<WindowItem, 'index' | 'end'>[],
  offset: number,
  inset: number
): number | undefined {
  return items.find((item) => item.end > offset + inset)?.index
}

/**
 * Where a failed range shows its error: at the first record from `first`
 * not loaded, so it stays in view beside any the page did load.
 */
function errorAt(
  range: RangeRecords,
  failed: { start: number; end: number },
  first: number
) {
  const end = Math.min(failed.end, range.count)
  const missing = (from: number) => {
    for (let at = from; at < end; at++)
      if (range.rowAt(at) === undefined) return at
    return undefined
  }
  return (
    missing(Math.max(first, failed.start)) ??
    missing(failed.start) ??
    failed.start
  )
}

/** The records to render in the window's rows, and the padding standing in for the rest. */
export function recordsWindow(view: WindowView, records: WindowRecords) {
  const { items, total, margin } = view
  const columns = records.columns ?? 1
  const range = 'range' in records ? records.range : undefined
  const rows = 'rows' in records ? records.rows : []
  const count = range?.count ?? rows.length
  const rowAt = (index: number) => (range ? range.rowAt(index) : rows[index])
  // The first row wholly below the header; `start` includes the scroll margin.
  const firstClear =
    items.find((item) => item.start >= view.offset + view.inset)?.index ??
    view.visibleStart ??
    0
  const errors = new Map<{ start: number; end: number }, number>()

  const cell = (row: number, index: number): WindowCell => {
    const leads = index === row * columns
    const record = rowAt(index)
    if (!range) return { key: record!.id, index, row, leads, record }
    // By index: a shifting offset API can return one id twice. With the
    // query too, so a new search's row starts fresh.
    const key = `${range.key}@${index}`
    if (record) return { key, index, row, leads, record }
    const failed = range.failed.find(
      ({ start, end }) => index >= start && index < end
    )
    if (!failed) return { key, index, row, leads }
    if (!errors.has(failed))
      errors.set(failed, errorAt(range, failed, firstClear * columns))
    return errors.get(failed) === index
      ? {
          key: `range-error-${failed.start}`,
          index,
          row,
          leads,
          failed: 'error'
        }
      : { key, index, row, leads, failed: 'blank' }
  }

  const cells = items.flatMap(({ index: row }) =>
    Array.from(
      { length: Math.max(0, Math.min(columns, count - row * columns)) },
      (_, offset) => cell(row, row * columns + offset)
    )
  )
  return {
    cells,
    padding: {
      paddingBlockStart: items.length ? items[0]!.start - margin : 0,
      paddingBlockEnd: items.length ? total - (items.at(-1)!.end - margin) : 0,
      // React removes swapped rows before inserting their replacements, and
      // WebKit clamps the scroll to the shorter body in between.
      minBlockSize: view.fixed ? total : undefined
    }
  }
}

export type WindowPadding = ReturnType<typeof recordsWindow>['padding']
