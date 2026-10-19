// Server-safe property-assignment layer; see COMPOUND_PATTERNS.md. Fields,
// layouts and the instance hold functions, so render Records from a client
// component.
import { RecordValue } from './RecordValue'
import { RecordsActions } from './RecordsActions'
import { RecordsBulkActions } from './RecordsBulkActions'
import { RecordsContent } from './RecordsContent'
import { RecordsHeader } from './RecordsHeader'
import { RecordsOptions } from './RecordsOptions'
import { RecordsPagination } from './RecordsPagination'
import { RecordsProvider, RecordsRoot } from './RecordsRoot'
import { RecordsSearch } from './RecordsSearch'
import { RecordsSelect } from './RecordsSelect'
import { RecordsStatus } from './RecordsStatus'
import { RecordsViewActions } from './RecordsViewActions'

const Records = RecordsRoot as typeof RecordsRoot & {
  Root: typeof RecordsRoot
  Provider: typeof RecordsProvider
  Header: typeof RecordsHeader
  Search: typeof RecordsSearch
  Select: typeof RecordsSelect
  Content: typeof RecordsContent
  Pagination: typeof RecordsPagination
  Status: typeof RecordsStatus
  Actions: typeof RecordsActions
  Options: typeof RecordsOptions
  BulkActions: typeof RecordsBulkActions
  ViewActions: typeof RecordsViewActions
}

Records.Root = RecordsRoot
Records.Provider = RecordsProvider
Records.Header = RecordsHeader
Records.Search = RecordsSearch
Records.Select = RecordsSelect
Records.Content = RecordsContent
Records.Pagination = RecordsPagination
Records.Status = RecordsStatus
Records.Actions = RecordsActions
Records.Options = RecordsOptions
Records.BulkActions = RecordsBulkActions
Records.ViewActions = RecordsViewActions

export { Records, RecordValue }
export { useRecords } from './useRecords'
export { downloadCsv } from './csv'
export type { RecordsInstance, UseRecordsOptions } from './useRecords'
export type {
  RecordName,
  RecordViewDefaults,
  RecordsAction,
  RecordsActionConfirm,
  RecordsActionContext,
  RecordsBulkAction,
  RecordsField,
  RecordsRow
} from './types'
export type { AnyRecordLayout } from './layouts'
export type { RecordsRange } from './ranges'
export type { RecordsRangeResult } from './useRangeLoading'
export type { RecordsActionsProps } from './RecordsActions'
export type { RecordsOptionsProps } from './RecordsOptions'
export type { RecordsBulkActionsProps } from './RecordsBulkActions'
export type { RecordValueProps } from './RecordValue'
export type { RecordsPaginationProps } from './RecordsPagination'
export type { RecordsProviderProps, RecordsRootProps } from './RecordsRoot'
export type { RecordsSearchProps } from './RecordsSearch'
export type { RecordsSelectProps } from './RecordsSelect'
export type { RecordsHeaderProps } from './RecordsHeader'
export type {
  RecordsViewActionsProps,
  RecordsViewHandler
} from './RecordsViewActions'
export type { RecordsRootProps as RecordsProps } from './RecordsRoot'
