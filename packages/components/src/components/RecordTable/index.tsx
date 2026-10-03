// Server-safe entry. Columns hold functions, so render from a client component.
export { RecordTable } from './RecordTablePreset'
export { tableColumns } from './columns'
export { tableLayout } from './tableLayout'
export type { RecordTableProps } from './RecordTablePreset'
export type { TableLayoutConfig, TableLayoutDefinition } from './tableLayout'
export type {
  RecordCellContext,
  RecordColumnWidth,
  RecordTableColumn,
  RecordTableColumnOptions
} from './types'
