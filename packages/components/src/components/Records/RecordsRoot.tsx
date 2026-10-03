'use client'

import {
  type ComponentProps,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  RecordsContext,
  type RecordsToolbarBox,
  useRecordsContext
} from './context'
import type { AnyRecordLayout } from './layouts'
import { leaveSelectOnEscape } from './selectMode'
import type { RecordsInstance } from './useRecords'

export type RecordsProviderProps<Row extends object = object> = {
  records: RecordsInstance<Row>
  /** The ways to show the records. Content shows the one the view names, or the first. */
  layouts: readonly AnyRecordLayout[]
  /** Accessible name for the records, such as the table's. */
  caption?: string
  children?: ReactNode
}

/** Shares records with parts spread across a layout, such as a `Pane`'s header, body and footer. */
export function RecordsProvider<Row extends object>({
  records,
  layouts,
  caption,
  children
}: RecordsProviderProps<Row>) {
  const [contentFill, setContentFill] = useState(false)
  const [toolbar, setToolbar] = useState<RecordsToolbarBox | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [bulkMounted, setBulkMounted] = useState(false)
  const [bulkSlot, setBulkSlot] = useState<HTMLElement | null>(null)
  const [selectControls, setSelectControls] = useState(false)
  const [bulkRunning, setBulkRunning] = useState<number | null>(null)
  const [bulkConfirming, setBulkConfirming] = useState<number | null>(null)
  // Parts read rows as plain objects; the consumer's Row narrows them.
  const shared = records as unknown as RecordsInstance
  const latestRecords = useRef(shared)
  useLayoutEffect(() => {
    latestRecords.current = shared
  })
  return (
    <RecordsContext
      value={{
        records: shared,
        layouts,
        caption,
        toolbar,
        setToolbar,
        contentFill,
        setContentFill,
        selectMode,
        setSelectMode,
        bulkMounted,
        setBulkMounted,
        bulkSlot,
        setBulkSlot,
        selectControls,
        setSelectControls,
        bulkRunning,
        setBulkRunning,
        bulkConfirming,
        setBulkConfirming,
        latestRecords
      }}
    >
      {children}
    </RecordsContext>
  )
}
RecordsProvider.displayName = 'Records.Provider'

export type RecordsRootProps<Row extends object = object> =
  ComponentProps<'div'> & Omit<RecordsProviderProps<Row>, 'children'>

export function RecordsRoot<Row extends object>({
  records,
  layouts,
  caption,
  ...props
}: RecordsRootProps<Row>) {
  return (
    <RecordsProvider records={records} layouts={layouts} caption={caption}>
      <RecordsRootElement {...props} />
    </RecordsProvider>
  )
}
RecordsRoot.displayName = 'Records.Root'

function RecordsRootElement({
  className,
  onKeyDown,
  ...props
}: ComponentProps<'div'>) {
  const { records, contentFill } = useRecordsContext()
  const leaveSelect = leaveSelectOnEscape(records)
  return (
    <div
      data-slot='records'
      // A Pane.Body gives the height a filling Content takes.
      data-pane-fill={contentFill || undefined}
      className={cn(
        // The toolbar's padding stands in for this gap while it sticks.
        'grid grid-cols-1 gap-(--records-gap) [--records-gap:--spacing(3)]',
        contentFill && 'flex h-full min-h-0 flex-col',
        className
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        leaveSelect(event)
      }}
      {...props}
    />
  )
}
