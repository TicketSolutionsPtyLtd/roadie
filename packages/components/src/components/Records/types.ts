import type { ReactNode } from 'react'

import type {
  RecordQuery,
  RecordSelection,
  RecordView
} from '@oztix/roadie-core/records'

import type { RecordsInstance } from './useRecords'

export type RecordName = { one: string; other: string }

/** A view to start from: any part left out takes its default. */
export type RecordViewDefaults = Omit<Partial<RecordView>, 'query'> & {
  query?: Partial<RecordQuery>
}

/** A row on the current page, with the id `getRowId` gave it. */
export type RecordsRow<Row> = { id: string; row: Row }

/** Asks before running. Danger actions confirm by default, and any action given an object confirms. `false` skips it. */
export type RecordsActionConfirm =
  false | { title?: string; description?: string; confirmLabel?: string }

/** Acts on the selected records. */
export type RecordsBulkAction = {
  label: string
  icon?: ReactNode
  intent?: 'danger'
  confirm?: RecordsActionConfirm
  /** Gets the selection, narrowed to records the search and filters still match, and the query it was taken against. */
  onAction: (
    selection: RecordSelection,
    query: RecordQuery
  ) => void | Promise<void>
}

/** Acts on everything the search and filters match, with nothing selected, such as an export. */
export type RecordsAction<Row extends object = object> = {
  label: string
  icon?: ReactNode
  intent?: 'danger'
  confirm?: RecordsActionConfirm
  onAction: (
    query: RecordQuery,
    records: RecordsInstance<Row>
  ) => void | Promise<void>
}
