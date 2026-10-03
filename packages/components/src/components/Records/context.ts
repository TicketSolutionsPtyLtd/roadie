'use client'

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  createContext,
  use
} from 'react'

import type { RecordView } from '@oztix/roadie-core/records'

import type { AnyRecordLayout } from './layouts'
import type { RecordsInstance } from './useRecords'

export type RecordsContextValue = {
  records: RecordsInstance
  layouts: readonly AnyRecordLayout[]
  /** Accessible name for the records, such as the table's. */
  caption?: string
  /** The mounted toolbar and its height, so Content's header sticks under it. */
  toolbar: RecordsToolbarBox | null
  setToolbar: Dispatch<SetStateAction<RecordsToolbarBox | null>>
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
  latestRecords: RefObject<RecordsInstance>
}

export type RecordsToolbarBox = { element: HTMLElement; height: number }

export const RecordsContext = createContext<RecordsContextValue | null>(null)

export function useRecordsContext() {
  const context = use(RecordsContext)
  if (!context)
    throw new Error(
      'Records parts must be inside Records.Root or Records.Provider'
    )
  return context
}

/** Select mode as shown: a selection made where Select mode applies is in it before the state commits. */
export const isSelecting = (
  records: Pick<RecordsInstance, 'selecting' | 'selectable' | 'selectedCount'>,
  selectMode: boolean
) =>
  records.selecting ||
  (selectMode && records.selectable && records.selectedCount > 0)

/** The layout the view names, or the first one given. */
export const activeLayout = (
  layouts: readonly AnyRecordLayout[],
  view: RecordView
) => layouts.find(({ type }) => type === view.layout.type) ?? layouts[0]
