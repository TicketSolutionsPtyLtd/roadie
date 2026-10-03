import { TableIcon } from '@phosphor-icons/react/ssr'

import type { RecordLayoutDefinition } from '../Records/layouts'
import { RecordTableContent } from './RecordTableContent'
import { RecordTableSettingsLazy } from './RecordTableSettingsLazy'
import type { RecordTableColumn } from './types'

export type TableLayoutConfig = { columns: readonly RecordTableColumn[] }

export type TableLayoutDefinition = RecordLayoutDefinition<TableLayoutConfig>

function hasColumnSettings(columns: readonly { pin?: boolean }[]) {
  const movable = columns.filter((column) => !column.pin).length
  return movable > 1 || (movable === 1 && movable < columns.length)
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
    config: { columns: columns as readonly RecordTableColumn[] },
    Content: RecordTableContent,
    // Pinned columns neither move nor hide, and a lone column with nothing
    // pinned can't hide, so either alone leaves nothing to set.
    Settings: hasColumnSettings(columns) ? RecordTableSettingsLazy : undefined,
    bulkActions: 'header'
  }
}
