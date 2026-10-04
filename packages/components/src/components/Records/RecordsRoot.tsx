'use client'

import {
  type ComponentProps,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useDevWarning } from '../../utils/useDevWarning'
import {
  RecordsContext,
  type RecordsToolbarBox,
  useRecordsContext
} from './context'
import type { AnyRecordLayout } from './layouts'
import { leaveSelectOnEscape } from './selectMode'
import { matchKey } from './selection'
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
  const scope = useId()
  const types = layouts.map(({ type }) => type)
  useDevWarning(
    new Set(types).size < types.length &&
      `[Roadie] Records has two layouts of one type (${types.join(', ')}). Content and Configure show only the first of each.`
  )
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
  const searchKey = matchKey(shared.scopedQuery)
  const queryRevision = useRef({ key: searchKey, count: 0 })
  useLayoutEffect(() => {
    latestRecords.current = shared
    // Counted, not compared, so a search that changes and changes back still
    // reads as changed to an action that started before it.
    if (queryRevision.current.key !== searchKey)
      queryRevision.current = {
        key: searchKey,
        count: queryRevision.current.count + 1
      }
  })
  return (
    <RecordsContext
      value={{
        records: shared,
        scope,
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
        latestRecords,
        queryRevision
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
        // Full width, as the table's frame is a size container that takes no width from its rows.
        'grid w-full grid-cols-1 gap-(--records-gap) [--records-gap:--spacing(3)]',
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
