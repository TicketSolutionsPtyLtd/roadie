import type { RecordQuery, RecordView } from '@oztix/roadie-core/records'

export type RecordName = { one: string; other: string }

/** A view to start from: any part left out takes its default. */
export type RecordViewDefaults = Omit<Partial<RecordView>, 'query'> & {
  query?: Partial<RecordQuery>
}

/** A row on the current page, with the id `getRowId` gave it. */
export type RecordsRow<Row> = { id: string; record: Row }
