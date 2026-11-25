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
  type RecordsData,
  RecordsDataContext,
  RecordsLayoutContext,
  RecordsStableContext,
  SELECTION_KEYS,
  useRecordsLayoutValue
} from './context'
import type { AnyRecordLayout } from './layouts'
import { useLeaveSelectOnEscape } from './selectMode'
import { matchKey } from './selection'
import type { RecordsInstance, RecordsState } from './useRecords'

export type RecordsProviderProps<Row extends object = object> = {
  records: RecordsInstance<Row>
  /** The ways to show the records. Content shows the one the view names, or the first. */
  layouts: readonly AnyRecordLayout[]
  /** Accessible name for the records, such as the table's. */
  caption?: string
  children?: ReactNode
}

const selectionKeys: ReadonlySet<string> = new Set(SELECTION_KEYS)
const sameButSelection = (held: RecordsState, next: RecordsState) =>
  Object.keys(next).every(
    (key) =>
      selectionKeys.has(key) ||
      Object.is(held[key as keyof RecordsData], next[key as keyof RecordsData])
  )

/** The last records whose every part but the selection is the same, so a tick leaves the data alone. */
function useHeldData(records: RecordsState): RecordsData {
  const [held, setHeld] = useState(records)
  if (held === records || sameButSelection(held, records)) return held
  setHeld(records)
  return records
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
      `[Roadie] Records has two layouts of one type (${types.join(', ')}). Records shows and offers only the first of each.`
  )
  const [contentFill, setContentFill] = useState(false)
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [bulkMounted, setBulkMounted] = useState(false)
  const [bulkSlot, setBulkSlot] = useState<HTMLElement | null>(null)
  const [selectControls, setSelectControls] = useState(false)
  const [bulkRunning, setBulkRunning] = useState<number | null>(null)
  const [bulkConfirming, setBulkConfirming] = useState<number | null>(null)
  // Parts read rows as plain objects; the consumer's Row narrows them.
  const shared = records as unknown as RecordsState
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
  // Split by how often each part changes, as Navigator's is. The compiler
  // keeps each value while what it holds does.
  const stable = {
    scope,
    setToolbar,
    setContentFill,
    setSelectMode,
    setBulkMounted,
    setBulkSlot,
    setSelectControls,
    setBulkRunning,
    setBulkConfirming,
    latestRecords,
    queryRevision
  }
  const layout = {
    layouts,
    caption,
    toolbar,
    contentFill,
    selectMode,
    bulkMounted,
    bulkSlot,
    selectControls,
    bulkRunning,
    bulkConfirming
  }
  const data = useHeldData(shared)
  const all = { ...stable, ...layout, records: shared }
  return (
    <RecordsStableContext value={stable}>
      <RecordsLayoutContext value={layout}>
        <RecordsDataContext value={data}>
          <RecordsContext value={all}>{children}</RecordsContext>
        </RecordsDataContext>
      </RecordsLayoutContext>
    </RecordsStableContext>
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
  const { contentFill } = useRecordsLayoutValue()
  const leaveSelect = useLeaveSelectOnEscape()
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
