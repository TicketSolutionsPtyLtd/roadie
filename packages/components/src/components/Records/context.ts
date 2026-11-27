'use client'

import { type Context, type RefObject, createContext, use } from 'react'

import type { RecordView } from '@oztix/roadie-core/records'

import type { AnyRecordLayout } from './layouts'
import type { RecordsState } from './useRecords'

export type RecordsContextValue = {
  records: RecordsState
  /** Ties the parts of one set of records together wherever they render, such as where focus lands once a bar goes. */
  scope: string
  layouts: readonly AnyRecordLayout[]
  /** Accessible name for the records, such as the table's. */
  caption?: string
  /** Whether Content fills its parent's height. */
  contentFill: boolean
  setContentFill: (fill: boolean) => void
  /** Whether the shown layout selects through Select mode, having no checkbox per record. */
  selectMode: boolean
  setSelectMode: (selectMode: boolean) => void
  /** Whether a BulkActions part is mounted, so a layout makes room for its bar. */
  bulkMounted: boolean
  setBulkMounted: (mounted: boolean) => void
  /** Where the shown layout takes the bulk actions bar, such as a table's header row; without one the bar floats. */
  bulkSlot: HTMLElement | null
  setBulkSlot: (slot: HTMLElement | null) => void
  /** Whether Select mode's own controls are showing, which clear the selection. */
  selectControls: boolean
  setSelectControls: (shown: boolean) => void
  /** The running and confirming bulk action, by index, shared so a bar that moves keeps them. */
  bulkRunning: number | null
  setBulkRunning: (index: number | null) => void
  bulkConfirming: number | null
  setBulkConfirming: (index: number | null) => void
  /** The records as of the last render, for an action that settles after renders its closure never saw. */
  latestRecords: RefObject<RecordsState>
  /** Bumped by each change to the search or filters, so an action can tell its query moved on. */
  queryRevision: RefObject<{ key: string; count: number }>
}

// Split by how often each part changes, as Navigator's is, so a part renders
// only for what it reads.

/** The scope, setters and refs: stable for the life of the records. */
export type RecordsStableValue = Pick<
  RecordsContextValue,
  | 'scope'
  | 'setContentFill'
  | 'setSelectMode'
  | 'setBulkMounted'
  | 'setBulkSlot'
  | 'setSelectControls'
  | 'setBulkRunning'
  | 'setBulkConfirming'
  | 'latestRecords'
  | 'queryRevision'
>
/** The layouts, and what the parts register with each other as they mount. */
export type RecordsLayoutValue = Pick<
  RecordsContextValue,
  | 'layouts'
  | 'caption'
  | 'contentFill'
  | 'selectMode'
  | 'bulkMounted'
  | 'bulkSlot'
  | 'selectControls'
  | 'bulkRunning'
  | 'bulkConfirming'
>

/** What a tick changes. A part that reads none of these leaves a tick alone. */
export const SELECTION_KEYS = [
  'selection',
  'selectedCount',
  'isSelected',
  'toggleRow',
  'selectPage',
  'selecting',
  'setSelecting'
] as const satisfies readonly (keyof RecordsState)[]
/** The records without their selection, which keep their identity through a tick. */
export type RecordsData = Omit<RecordsState, (typeof SELECTION_KEYS)[number]>

export const RecordsStableContext = createContext<RecordsStableValue | null>(
  null
)
export const RecordsLayoutContext = createContext<RecordsLayoutValue | null>(
  null
)
export const RecordsDataContext = createContext<RecordsData | null>(null)
/** Everything, the selection too, so it changes with every change. */
export const RecordsContext = createContext<RecordsContextValue | null>(null)

function useRequired<T>(context: Context<T | null>) {
  const value = use(context)
  if (!value)
    throw new Error(
      'Records parts must be inside Records.Root or Records.Provider'
    )
  return value
}

/** Everything, so it renders on every change: what shows the selection reads it. */
export const useRecordsContext = () => useRequired(RecordsContext)
export const useRecordsStable = () => useRequired(RecordsStableContext)
export const useRecordsLayoutValue = () => useRequired(RecordsLayoutContext)
/** The records without their selection, so a tick renders nothing. */
export const useRecordsData = () => useRequired(RecordsDataContext)

/** Select mode as shown: a selection made where Select mode applies is in it before the state commits. */
export const isSelecting = (
  records: Pick<RecordsState, 'selecting' | 'selectable' | 'selectedCount'>,
  selectMode: boolean
) =>
  selectMode &&
  (records.selecting || (records.selectable && records.selectedCount > 0))

/** Whether Select mode applies: the shown layout said so as it mounted, or its definition selects that way under 40rem. */
export const selectModeApplies = (
  layouts: readonly AnyRecordLayout[],
  view: RecordView,
  selectMode: boolean
) => selectMode || activeLayout(layouts, view)?.selectMode === 'narrow'

/** The layout the view names, or the first one given. */
export const activeLayout = (
  layouts: readonly AnyRecordLayout[],
  view: RecordView
) => layouts.find(({ type }) => type === view.layout.type) ?? layouts[0]
