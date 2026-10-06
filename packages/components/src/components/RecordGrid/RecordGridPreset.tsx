'use client'

import { useMemo } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  Records,
  type RecordsAction,
  type RecordsBulkAction,
  type RecordsViewActionsProps
} from '../Records'
import { type UseRecordsOptions, useRecords } from '../Records/useRecords'
import { gridLayout } from './gridLayout'
import type { GridLayoutConfig } from './types'

export type RecordGridProps<Row extends object> = UseRecordsOptions<Row> & {
  /** The field each part of a card shows, as `gridLayout` takes them. */
  card: GridLayoutConfig<Row>
  /** Accessible name for the cards. */
  caption?: string
  /** Names the search field too, unless `searchLabel` is given. @default 'Search and filter' */
  searchPlaceholder?: string
  /** Names the search field when its placeholder doesn't. */
  searchLabel?: string
  /** The key that focuses the search, or `false` for none. @default '/' */
  searchShortcut?: string | false
  /** @default [25, 50, 100] */
  pageSizes?: number[]
  /** Turns on selection and shows the bulk actions once something is selected. */
  bulkActions?: readonly RecordsBulkAction[]
  /** Act on everything the search and filters match, with nothing selected, such as an export. Shown at the end of the toolbar. */
  gridActions?: readonly RecordsAction<Row>[]
  /** Shows the open view's name, marked once it differs from `baseline`, with a menu to save, save as, rename, reset or delete it. The app keeps the views. */
  viewActions?: RecordsViewActionsProps
  /** Scrolls the cards in their own box this tall, any CSS length. */
  maxHeight?: string
  /** Fills its parent's height and scrolls inside, like `maxHeight`. The parent needs a definite height, such as `Pane.Body`. */
  fill?: boolean
  className?: string
}

/** Records as a grid of cards with the standard toolbar, pagination and status. */
export function RecordGrid<Row extends object>({
  card,
  caption,
  searchPlaceholder,
  searchLabel,
  searchShortcut,
  pageSizes,
  bulkActions,
  gridActions,
  viewActions,
  maxHeight,
  fill,
  className,
  ...options
}: RecordGridProps<Row>) {
  const hasBulkActions = bulkActions !== undefined && bulkActions.length > 0
  const records = useRecords({
    ...options,
    selectable: options.selectable ?? hasBulkActions
  })
  const layouts = useMemo(() => [gridLayout(card)], [card])
  return (
    <Records.Root
      records={records}
      layouts={layouts}
      caption={caption}
      // Set here too, so a server render already fills.
      data-pane-fill={fill || undefined}
      className={cn(fill && 'flex h-full min-h-0 flex-col', className)}
    >
      <Records.Toolbar
        searchPlaceholder={searchPlaceholder}
        searchLabel={searchLabel}
        searchShortcut={searchShortcut}
        actions={gridActions}
        viewActions={viewActions}
      />
      <Records.Content maxHeight={maxHeight} fill={fill} />
      <Records.Pagination pageSizes={pageSizes} />
      <Records.Status />
      {hasBulkActions && <Records.BulkActions actions={bulkActions} />}
    </Records.Root>
  )
}
RecordGrid.displayName = 'RecordGrid'
