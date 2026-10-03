'use client'

import {
  type ComponentProps,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RecordsContext, useRecordsContext } from './context'
import type { RecordLayoutDefinition } from './layouts'
import { watchSurface } from './surface'
import type { RecordsInstance } from './useRecords'

export type RecordsProviderProps<Row extends object = object> = {
  records: RecordsInstance<Row>
  /** The ways to show the records. Content shows the one the view names, or the first. */
  layouts: readonly RecordLayoutDefinition[]
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
  return (
    <RecordsContext
      value={{
        // Parts read rows as plain objects; the consumer's Row narrows them.
        records: records as unknown as RecordsInstance,
        layouts,
        caption,
        contentFill,
        setContentFill
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

function RecordsRootElement({ className, ...props }: ComponentProps<'div'>) {
  const { contentFill } = useRecordsContext()
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (ref.current) return watchSurface(ref.current)
  }, [])
  return (
    <div
      ref={ref}
      data-slot='records'
      // A Pane.Body gives the height a filling Content takes.
      data-pane-fill={contentFill || undefined}
      className={cn(
        'grid grid-cols-1 gap-3',
        contentFill && 'flex h-full min-h-0 flex-col',
        className
      )}
      {...props}
    />
  )
}
