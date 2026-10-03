'use client'

import { createContext, use } from 'react'

import type { RecordLayoutDefinition } from './layouts'
import type { RecordsInstance } from './useRecords'

export type RecordsContextValue = {
  records: RecordsInstance
  layouts: readonly RecordLayoutDefinition[]
  /** Accessible name for the records, such as the table's. */
  caption?: string
  /** Whether Content fills its parent's height. */
  contentFill: boolean
  setContentFill: (fill: boolean) => void
}

export const RecordsContext = createContext<RecordsContextValue | null>(null)

export function useRecordsContext() {
  const context = use(RecordsContext)
  if (!context) throw new Error('Records parts must be inside Records.Root')
  return context
}
