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

/** Range mode's loading state, which a layout reads to render records at their index. */
export type RecordsRange<Row = object> = {
  /** What the loaded records belong to: the search, filters, sort and zone. */
  key: string
  /** Rows the list is sized for, loaded or not. */
  count: number
  /** Every match, once known: `rowCount`, or the records loaded after a short last range. */
  total?: number
  /** A range is loading. */
  loading: boolean
  /** Ranges whose load failed, shown as an error in place of their rows. */
  failed: readonly { start: number; end: number }[]
  /** Loads the failed ranges again. */
  retry: () => void
  /** Bumped by each retry. */
  attempt: number
  /** The record loaded at an index, or undefined for a gap. */
  rowAt: (index: number) => RecordsRow<Row> | undefined
  /** Reports the rows on screen, inclusive, and a row to reach, so missing ranges load. */
  view: (first: number, last: number, target?: number) => void
}
