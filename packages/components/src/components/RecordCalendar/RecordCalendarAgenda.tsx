'use client'

import { useMemo } from 'react'

import { compareDates } from '@oztix/roadie-core/datetime'
import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import { dayLabel } from '../Calendar/labels'
import { gridParts } from '../RecordGrid/parts'
import { RecordTableNarrowRows } from '../RecordTable/RecordTableNarrowRows'
import type { RecordGroup } from '../Records/groups'
import type { RecordsRow } from '../Records/types'
import type { useRecordsLayout } from '../Records/useRecordsLayout'

const ignoreToggle = () => {}

/** A phone's calendar: the month's records under each day they cover, days with none left out. */
export function RecordCalendarAgenda({
  frame,
  days,
  title,
  layout,
  locale,
  today,
  monthName
}: {
  frame: ReturnType<typeof useRecordsLayout>
  days: ReadonlyMap<string, readonly RecordsRow<object>[]>
  title: string
  layout: RecordLayout
  locale: string
  today: string | null
  monthName: string
}) {
  const { records } = frame
  const parts = useMemo(
    () => gridParts({ title }, records.fields as RecordField[], layout, 'list'),
    [title, records.fields, layout]
  )
  const groups = useMemo<RecordGroup[]>(
    () =>
      [...days.keys()].sort(compareDates).map((date) => {
        const label = dayLabel(date, locale)
        return {
          key: date,
          label: date === today ? `Today, ${label}` : label,
          rows: [...days.get(date)!]
        }
      }),
    [days, locale, today]
  )
  if (groups.length === 0)
    return frame.busy ? null : (
      <p className='py-6 text-center text-sm text-subtle'>
        Nothing in {monthName}
      </p>
    )
  return (
    <RecordTableNarrowRows
      rows={records.matchingRows}
      groups={groups}
      parts={parts}
      layout='list'
      bleed={!frame.boxed}
      stickyTop={frame.stickyTop}
      timeZone={records.timeZone}
      caption={frame.caption}
      busy={frame.busy}
      selecting={false}
      onToggle={ignoreToggle}
      rowActions={frame.rowActions}
      getRowHref={records.getRowHref}
    />
  )
}
