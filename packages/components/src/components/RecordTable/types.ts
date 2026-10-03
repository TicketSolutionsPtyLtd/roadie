import type { ReactNode } from 'react'

import type { RecordField } from '@oztix/roadie-core/records'

/** In rem. `grow` shares out the spare width, like `fr`. */
export type RecordColumnWidth = { min: number; grow?: number }

export type RecordCellContext<Row extends object = object> = {
  value: unknown
  row: Row
  field: RecordField
}

/** How the table presents one field. */
export type RecordTableColumn<Row extends object = object> = {
  key: string
  field: RecordField
  /** Sticks to the start while the table scrolls sideways. Pinned columns stay first and can't be hidden. */
  pin?: boolean
  /** Defaults to the column's content. */
  width?: RecordColumnWidth
  /** Replaces the field's own rendering. */
  cell?: (context: RecordCellContext<Row>) => ReactNode
}

export type RecordTableColumnOptions<Row extends object = object> = Omit<
  RecordTableColumn<Row>,
  'key' | 'field'
>
