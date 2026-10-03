'use client'

import { type Dispatch, type SetStateAction, createContext, use } from 'react'

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
}

export type RecordsToolbarBox = { element: HTMLElement; height: number }

export const RecordsContext = createContext<RecordsContextValue | null>(null)

export function useRecordsContext() {
  const context = use(RecordsContext)
  if (!context) throw new Error('Records parts must be inside Records.Root')
  return context
}
