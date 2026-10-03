// Server-safe property-assignment layer; see COMPOUND_PATTERNS.md. Fields,
// layouts and the instance hold functions, so render Records from a client
// component.
import { RecordValue } from './RecordValue'
import { RecordsContent } from './RecordsContent'
import { RecordsPagination } from './RecordsPagination'
import { RecordsProvider, RecordsRoot } from './RecordsRoot'
import { RecordsSearch } from './RecordsSearch'
import { RecordsStatus } from './RecordsStatus'
import { RecordsToolbar } from './RecordsToolbar'

const Records = RecordsRoot as typeof RecordsRoot & {
  Root: typeof RecordsRoot
  Provider: typeof RecordsProvider
  Toolbar: typeof RecordsToolbar
  Search: typeof RecordsSearch
  Content: typeof RecordsContent
  Pagination: typeof RecordsPagination
  Status: typeof RecordsStatus
}

Records.Root = RecordsRoot
Records.Provider = RecordsProvider
Records.Toolbar = RecordsToolbar
Records.Search = RecordsSearch
Records.Content = RecordsContent
Records.Pagination = RecordsPagination
Records.Status = RecordsStatus

export { Records, RecordValue }
export { useRecords } from './useRecords'
export type { RecordsInstance, UseRecordsOptions } from './useRecords'
export type { RecordLayoutDefinition, RecordsContentProps } from './layouts'
export type { RecordName, RecordViewDefaults, RecordsRow } from './types'
export type { RecordValueProps } from './RecordValue'
export type { RecordsPaginationProps } from './RecordsPagination'
export type { RecordsProviderProps, RecordsRootProps } from './RecordsRoot'
export type { RecordsSearchProps } from './RecordsSearch'
export type { RecordsToolbarProps } from './RecordsToolbar'
export type { RecordsRootProps as RecordsProps } from './RecordsRoot'
