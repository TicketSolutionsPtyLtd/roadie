import { type ResolvedRecordQuery, resolveRecordQuery } from './resolve'
import type {
  RecordField,
  RecordFilter,
  RecordQuery,
  RecordQueryOptions
} from './types'

/** Bumped only when a server must read a request differently. */
export const RECORDS_REQUEST_VERSION = 1

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

function checkPaging(paging: RecordsRequestPaging) {
  const fits =
    'page' in paging
      ? isWhole(paging.page, 0) && isWhole(paging.pageSize, 1)
      : isWhole(paging.start, 0) && isWhole(paging.end, paging.start + 1)
  if (!fits) {
    throw new RangeError(`Paging reads no rows: ${JSON.stringify(paging)}`)
  }
}

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
): RecordsRequest & (Paging extends RecordsRequestPaging ? Paging : unknown) {
  type Built = RecordsRequest &
    (Paging extends RecordsRequestPaging ? Paging : unknown)
  if (paging) checkPaging(paging)
  const scoped = scope.length
    ? { ...query, filters: [...scope, ...query.filters] }
    : query
  return {
    version: RECORDS_REQUEST_VERSION,
    query: resolveRecordQuery(scoped, fields, options),
    ...paging
  } as Built
}
