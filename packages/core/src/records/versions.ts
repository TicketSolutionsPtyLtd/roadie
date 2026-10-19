/** The `RecordView` format. `validateRecordView` reads a view without one as this. */
export const RECORD_VIEW_VERSION = 1

/** The URL format `recordViewToSearchParams` writes as `v`. */
export const RECORD_URL_VERSION = 1

/**
 * The `RecordsRequest` format. Bumped only when an existing key's meaning
 * changes. A new key at the top or in `query` keeps version 1, so a server
 * ignores keys it doesn't know.
 *
 * Filters are strict, so a version 1 server rejects an operator it doesn't
 * know. A new operator, such as the reserved `near`, needs version 2, or a
 * field the server opts in to it, never a quiet addition to version 1.
 */
export const RECORDS_REQUEST_VERSION = 1
