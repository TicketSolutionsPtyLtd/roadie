import { type ResolvedRecordQuery, resolveRecordQuery } from './resolve'
import type {
  RecordField,
  RecordFilter,
  RecordQuery,
  RecordQueryOptions
} from './types'
import { RECORDS_REQUEST_VERSION } from './versions'

export { RECORDS_REQUEST_VERSION }

/** A page, zero-based, or rows `start` to `end`, `end` exclusive. */
export type RecordsRequestPaging =
  { page: number; pageSize: number } | { start: number; end: number }

/**
 * What a server reads to search, filter, sort, export or act on records: the
 * resolved query, never the view. Field keys are logical names an adapter
 * maps to its index. Without paging it means every record that matches.
 */
export type RecordsRequest = {
  version: typeof RECORDS_REQUEST_VERSION
  query: ResolvedRecordQuery
}

/** One page of a paged list. */
export type RecordsPageRequest = RecordsRequest & {
  page: number
  pageSize: number
}

/** One range of a list loaded by range. */
export type RecordsRangeRequest = RecordsRequest & {
  start: number
  end: number
}

export type RecordsRequestOptions = RecordQueryOptions & {
  /** The page's own filters, which go before the query's. */
  scope?: readonly RecordFilter[]
}

const isWhole = (value: number, min: number) =>
  Number.isSafeInteger(value) && value >= min

/** Only the paging keys, so a position's `row` stays out of the request. */
function readPaging(paging: RecordsRequestPaging): RecordsRequestPaging {
  if ('page' in paging) {
    const { page, pageSize } = paging
    if (isWhole(page, 0) && isWhole(pageSize, 1)) return { page, pageSize }
  } else {
    const { start, end } = paging
    if (isWhole(start, 0) && isWhole(end, start + 1)) return { start, end }
  }
  throw new RangeError(`Paging reads no rows: ${JSON.stringify(paging)}`)
}

type Built<Paging> = Paging extends { page: number }
  ? RecordsPageRequest
  : Paging extends { start: number }
    ? RecordsRangeRequest
    : RecordsRequest

/**
 * Builds the versioned request a server reads, with relative dates fixed at
 * `now` and the scope first.
 */
export function toRecordsRequest<
  Paging extends RecordsRequestPaging | undefined = undefined
>(
  query: RecordQuery,
  fields: readonly RecordField[],
  { scope = [], ...options }: RecordsRequestOptions,
  paging?: Paging
): Built<Paging> {
  const scoped = scope.length
    ? { ...query, filters: [...scope, ...query.filters] }
    : query
  return {
    version: RECORDS_REQUEST_VERSION,
    query: resolveRecordQuery(scoped, fields, options),
    ...(paging && readPaging(paging))
  } as Built<Paging>
}
