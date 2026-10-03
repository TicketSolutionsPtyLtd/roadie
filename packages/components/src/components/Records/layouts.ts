import type { ComponentType, ReactNode } from 'react'

import type { RecordLayout } from '@oztix/roadie-core/records'

export type RecordsContentProps = {
  className?: string
  /** Scrolls the records in their own box this tall, any CSS length. The toolbar stays outside it. */
  maxHeight?: string
  /** Fills its parent's height and scrolls inside, like `maxHeight`. The parent needs a definite height, such as `Pane.Body`. */
  fill?: boolean
}

/** One way to show records, picked by the view's `layout.type`. */
export type RecordLayoutDefinition = {
  type: RecordLayout['type']
  label: string
  icon: ReactNode
  /** Receives the definition, so a layout's own settings, like table columns, ride on it. */
  Content: ComponentType<
    RecordsContentProps & { layout: RecordLayoutDefinition }
  >
}
