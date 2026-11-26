import { TableIcon } from '@phosphor-icons/react/ssr'

import { groupableFields } from '../Records/groups'
import type { RecordLayoutDefinition } from '../Records/layouts'
import { RecordTableContent } from './RecordTableContent'
import { RecordTableSettingsLazy } from './RecordTableSettingsLazy'
import { type RecordTableNarrowLayout, narrowLayout } from './narrow'
import type { RecordTableColumn } from './types'

export type TableLayoutConfig = {
  columns: readonly RecordTableColumn[]
  /**
   * How the table shows its records under 40rem. Defaults to cards when a column is a `detail`, else list rows.
   * @deprecated Cards leave RecordTable at the next major; for cards, use `RecordGrid`.
   */
  narrow?: RecordTableNarrowLayout
}

export type TableLayoutOptions = Omit<TableLayoutConfig, 'columns'>

export type TableLayoutDefinition = RecordLayoutDefinition<TableLayoutConfig>

// Pinned columns neither move nor hide, and a lone column with nothing
// pinned can't hide, so either alone leaves no columns to set. A column's
// field that can group leaves Group by to set.
function hasSettings(columns: readonly RecordTableColumn[]) {
  const movable = columns.filter((column) => !column.pin).length
  return (
    movable > 1 ||
    (movable === 1 && movable < columns.length) ||
    groupableFields(columns.map((column) => column.field)).length > 0
  )
}

/** The table layout for `Records`, showing these columns. */
export function tableLayout<Row extends object>(
  columns: readonly RecordTableColumn<Row>[],
  { narrow }: TableLayoutOptions = {}
): TableLayoutDefinition {
  return {
    type: 'table',
    label: 'Table',
    icon: <TableIcon weight='bold' className='size-4' aria-hidden />,
    // A column's cell reads the consumer's Row; the table hands it the same row.
    config: { columns: columns as readonly RecordTableColumn[], narrow },
    Content: RecordTableContent,
    Settings: hasSettings(columns as readonly RecordTableColumn[])
      ? RecordTableSettingsLazy
      : undefined,
    // A table that turns into a list has no header row, so its bar floats there.
    bulkActions: 'header',
    // Re-flowed rows hide their checkboxes under 40rem until Select; deprecated cards say so as they mount.
    selectMode:
      (narrow ?? narrowLayout(columns)) === 'cards' ? undefined : 'narrow'
  }
}
