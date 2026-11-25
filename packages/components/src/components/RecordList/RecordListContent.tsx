'use client'

import { useMemo } from 'react'

import { gridParts } from '../RecordGrid/parts'
import {
  NarrowSkeleton,
  RecordTableNarrowRows
} from '../RecordTable/RecordTableNarrowRows'
import { groupRecordsBy } from '../Records/groups'
import type { RecordsContentProps } from '../Records/layouts'
import {
  RecordsLayoutFrame,
  RecordsLayoutState,
  useRecordsLayout
} from '../Records/useRecordsLayout'
import { useSelectModeLayout } from '../Records/useSelectModeLayout'
import { listGroupFields } from './groupBy'
import type { ListLayoutConfig } from './types'

export type RecordListContentProps = RecordsContentProps & {
  config: ListLayoutConfig
}

export function RecordListContent({
  className,
  maxHeight,
  fill = false,
  config
}: RecordListContentProps) {
  const frame = useRecordsLayout({ fill, maxHeight })
  const { records, caption, boxed, state, partial } = frame
  const { fields, view, range } = records
  const parts = useMemo(
    () => gridParts(config, fields, view.layout, 'list'),
    [config, fields, view.layout]
  )
  const groupFields = useMemo(
    () => listGroupFields(fields, view.layout),
    [fields, view.layout]
  )
  // A range list loads rows as they scroll into view, so it stays ungrouped
  // until groups can come from the server.
  const groups = useMemo(
    () =>
      groupFields.length > 0 && !range
        ? groupRecordsBy(records.rows, groupFields)
        : undefined,
    [groupFields, range, records.rows]
  )
  // Rows have no checkboxes, so the list selects only through Select mode.
  const selecting = useSelectModeLayout(true)

  const body =
    state === 'loading' ? (
      <NarrowSkeleton
        parts={parts}
        layout='list'
        size={records.position.pageSize}
      />
    ) : state ? (
      <RecordsLayoutState key={state} kind={state} records={records} />
    ) : (
      <RecordTableNarrowRows
        rows={records.rows}
        groups={groups}
        groupHeadings
        parts={parts}
        layout='list'
        bleed={!boxed}
        timeZone={records.timeZone}
        caption={caption}
        busy={frame.busy}
        firstIndex={partial ? frame.firstIndex : undefined}
        setSize={partial && !range ? records.resultCount : undefined}
        selecting={selecting}
        isSelected={frame.isSelected}
        onToggle={frame.toggleRow}
        rowActions={frame.rowActions}
        getRowHref={records.getRowHref}
        range={range}
        row={records.position.row}
        onRow={records.setRow}
      />
    )

  return (
    <RecordsLayoutFrame
      frame={frame}
      slot='record-list'
      fill={fill}
      maxHeight={maxHeight}
      className={className}
    >
      {body}
    </RecordsLayoutFrame>
  )
}
RecordListContent.displayName = 'RecordListContent'
