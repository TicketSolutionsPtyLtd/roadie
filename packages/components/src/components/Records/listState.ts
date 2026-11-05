/** A count or index as a whole number at least `min`, or the fallback. */
export const whole = (
  value: number | undefined,
  min: number,
  fallback: number
) =>
  value !== undefined && Number.isFinite(value)
    ? Math.max(min, Math.floor(value))
    : fallback

/** The records held, gaps left out, each with its index in `data`. */
export function loadedRows<Row>(data: readonly (Row | undefined)[]): {
  rows: readonly Row[]
  at: number[]
} {
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
}

/** Every index a record sits at, so a record listed twice keeps both. */
export function rowIndexes<Row>(loaded: {
  rows: readonly Row[]
  at: readonly number[]
}): Map<Row, number[]> {
  const indexes = new Map<Row, number[]>()
  loaded.rows.forEach((row, k) => {
    const index = loaded.at[k]!
    const held = indexes.get(row)
    if (held) held.push(index)
    else indexes.set(row, [index])
  })
  return indexes
}

/** Each matching record with its id, a repeated record's copies by their own index. */
export function identifyRows<Row>(
  matching: readonly Row[],
  indexesOf: ReadonlyMap<Row, readonly number[]>,
  getRowId: (row: Row, index: number) => string
): { id: string; row: Row }[] {
  // A repeated record sorts with equal keys, so its copies keep their order.
  const seen = new Map<Row, number>()
  return matching.map((row) => {
    const taken = seen.get(row) ?? 0
    seen.set(row, taken + 1)
    return { id: getRowId(row, indexesOf.get(row)?.[taken] ?? 0), row }
  })
}

export type PagingInput = {
  /** Loads ranges as the list scrolls, so it's one long page. */
  ranged: boolean
  /** The server filters, so `count` is the result. */
  server: boolean
  count: number | undefined
  countExact: boolean
  range: { total?: number; rowCount?: number; rowCountExact?: boolean }
  /** Records the browser matched, or loaded in range mode. */
  matched: number
  loaded: number
  page: number
  pageSize: number
  /** No load pending or failed, so the count can move the page. */
  settled: boolean
}

export type Paging = {
  resultCount: number
  resultCountExact: boolean
  pageCount: number
  lastPage: number
  /** The page sits past the last, so it clamps to `lastPage`. */
  outOfRange: boolean
}

export function paging({
  ranged,
  server,
  count,
  countExact,
  range,
  matched,
  loaded,
  page,
  pageSize,
  settled
}: PagingInput): Paging {
  const resultCount = ranged
    ? (range.total ?? loaded)
    : server
      ? whole(count, 0, 0)
      : matched
  const resultCountExact = ranged
    ? range.rowCount === undefined || !!range.rowCountExact
    : count === undefined || countExact
  // A range list is one long page. Past a floor the server stopped counting
  // at, only whole pages within it can be fetched.
  const pageCount = ranged
    ? 1
    : Math.max(
        1,
        (resultCountExact ? Math.ceil : Math.floor)(resultCount / pageSize)
      )
  const lastPage = pageCount - 1
  // A count from a pending or failed fetch would wipe a deep-linked page.
  const outOfRange = !ranged && settled && page > lastPage
  return { resultCount, resultCountExact, pageCount, lastPage, outOfRange }
}

export type SetupFlags = {
  /** Parts of the view the fields can't apply. */
  skipped: readonly string[]
  unidentified: boolean
  rangeUnidentified: boolean
  rangePaged: boolean
  capped: boolean
  sumsPage: boolean
  sumsRanges: boolean
}

/** Dev warnings for a setup that can't do what it asks. */
export function setupWarnings(flags: SetupFlags): string[] {
  const warnings: [boolean, string][] = [
    [
      flags.skipped.length > 0,
      `[Roadie] Records skipped part of the view:\n${flags.skipped.join('\n')}`
    ],
    [
      flags.unidentified,
      '[Roadie] Records in server mode need getRowId to select: index ids repeat on every page.'
    ],
    [
      flags.rangeUnidentified,
      '[Roadie] Records with loadRange need getRowId, so a selection survives refetching.'
    ],
    [
      flags.rangePaged,
      '[Roadie] Records with loadRange ignore the page: the list scrolls, and position.row keeps the place.'
    ],
    [
      flags.capped,
      '[Roadie] Records with loadRange stop at 300,000 rows. Filter the list or use paged server mode.'
    ],
    [
      flags.sumsPage,
      "[Roadie] Records totals can't sum in server mode: the list holds only a page. Pass the server's totals as { values }."
    ],
    [
      flags.sumsRanges,
      "[Roadie] Records totals can't sum with loadRange: the list holds only the ranges loaded. Leave totals out, or pass only a label, and resolve each range with the server's totals beside rowCount."
    ]
  ]
  return warnings.flatMap(([applies, message]) => (applies ? [message] : []))
}
