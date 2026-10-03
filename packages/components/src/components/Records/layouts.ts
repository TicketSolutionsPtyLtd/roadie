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
}

/** A layout of any config, as `Records` takes them. */
export type AnyRecordLayout = Omit<RecordLayoutDefinition, 'Content'> & {
  Content: (props: RecordsContentProps & { config: never }) => ReactNode
}
