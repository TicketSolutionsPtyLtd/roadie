import type { ReactNode } from 'react'

import type { RecordLayout } from '@oztix/roadie-core/records'

export type RecordsContentProps = {
  className?: string
  /** Scrolls the records in their own box this tall, any CSS length. The toolbar stays outside it. */
  maxHeight?: string
  /** Fills its parent's height and scrolls inside, like `maxHeight`. The parent needs a definite height, such as `Pane.Body`. */
  fill?: boolean
}

/**
 * One way to show records, picked by the view's `layout.type`. `config`, such
 * as a table's columns, reaches a stable `Content`, so building a definition
 * in render doesn't remount it.
 */
export type RecordLayoutDefinition<Config = unknown> = {
  type: RecordLayout['type']
  label: string
  icon: ReactNode
  config: Config
  Content: (props: RecordsContentProps & { config: Config }) => ReactNode
  /** Where `Records.BulkActions` shows: in the layout's header row, which its Content provides, or floating at the foot of the screen. @default 'floating' */
  bulkActions?: 'header' | 'floating'
  /** The layout's own part of `Records.Options`, under the sort, such as the table's columns. */
  Settings?: (props: { config: Config }) => ReactNode
}

/** A layout of any config, as `Records` takes them. */
export type AnyRecordLayout = Omit<
  RecordLayoutDefinition,
  'Content' | 'Settings'
> & {
  Content: (props: RecordsContentProps & { config: never }) => ReactNode
  Settings?: (props: { config: never }) => ReactNode
}
