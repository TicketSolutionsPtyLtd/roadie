// Server-safe entry. Columns hold functions, so render from a client component.
export { RecordTable } from './RecordTablePreset'
export { shownColumns, tableColumns } from './columns'
export { tableLayout } from './tableLayout'
export type { RecordTableProps } from './RecordTablePreset'
export type {
  TableLayoutConfig,
  TableLayoutDefinition,
  TableLayoutOptions
} from './tableLayout'
export type { RecordTableNarrowLayout } from './narrow'
export type {
  RecordCellContext,
  RecordColumnWidth,
  RecordTableColumn,
  RecordTableNarrow,
  RecordTableColumnOptions
} from './types'
