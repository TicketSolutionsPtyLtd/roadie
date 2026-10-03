import { TableIcon } from '@phosphor-icons/react/ssr'

import type { RecordLayoutDefinition } from '../Records/layouts'
import { RecordTableContent } from './RecordTableContent'
import type { RecordTableColumn } from './types'

export type TableLayoutDefinition = RecordLayoutDefinition & {
  type: 'table'
  columns: readonly RecordTableColumn[]
}

/** The table layout for `Records`, showing these columns. */
export function tableLayout<Row extends object>(
  columns: readonly RecordTableColumn<Row>[]
): TableLayoutDefinition {
  return {
    type: 'table',
    label: 'Table',
    icon: <TableIcon weight='bold' className='size-4' aria-hidden />,
    // A column's cell reads the consumer's Row; the table hands it the same row.
    columns: columns as readonly RecordTableColumn[],
    Content: RecordTableContent
  }
}
