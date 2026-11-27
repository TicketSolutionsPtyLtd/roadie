'use client'

import { useMemo } from 'react'

import {
  Records,
  type RecordsAction,
  type RecordsViewActionsProps
} from '../Records'
import { type UseRecordsOptions, useRecords } from '../Records/useRecords'
import { calendarLayout } from './calendarLayout'
import type { CalendarLayoutConfig } from './types'

export type RecordCalendarProps<Row extends object> = UseRecordsOptions<Row> & {
  /** The date field that places records, and the field each chip shows, as `calendarLayout` takes them. */
  calendar: CalendarLayoutConfig<Row>
  /** Accessible name for the records. */
  caption?: string
  /** Names the search field too, unless `searchLabel` is given. @default 'Search and filter' */
  searchPlaceholder?: string
  /** Names the search field when its placeholder doesn't. */
  searchLabel?: string
  /** The key that focuses the search, a `KeyboardEvent.key` value such as `/`, or `false` for none. @default '/' */
  searchFocusShortcut?: string | false
  /** Act on everything the search and filters match, with nothing selected, such as an export. Shown at the end of the toolbar. */
  actions?: readonly RecordsAction<Row>[]
  /** Shows the open view's name, marked once it differs from `baseline`, with a menu to save, save as, rename, reset or delete it. The app keeps the views. */
  viewActions?: RecordsViewActionsProps
  className?: string
}

/** Records on a month calendar, each on its day, with the standard toolbar and status. */
export function RecordCalendar<Row extends object>({
  calendar,
  caption,
  searchPlaceholder,
  searchLabel,
  searchFocusShortcut,
  actions,
  viewActions,
  className,
  ...options
}: RecordCalendarProps<Row>) {
  const records = useRecords(options)
  const layouts = useMemo(() => [calendarLayout(calendar)], [calendar])
  return (
    <Records.Root
      records={records}
      layouts={layouts}
      caption={caption}
      className={className}
    >
      <Records.Header
        searchPlaceholder={searchPlaceholder}
        searchLabel={searchLabel}
        searchFocusShortcut={searchFocusShortcut}
        actions={actions}
        viewActions={viewActions}
      />
      <Records.Content />
      <Records.Status />
    </Records.Root>
  )
}
RecordCalendar.displayName = 'RecordCalendar'
