import { type ReactNode, memo } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { ListItemContent } from '../List/ListItemContent'
import { listItemVariants } from '../List/variants'
import { recordTitle } from '../Records/RecordCard'
import { RecordPartValue } from '../Records/RecordPartValue'
import { RecordsRowActions } from '../Records/RecordsRowActions'
import { RecordsRowCheckbox } from '../Records/RecordsRowCheckbox'
import type { RecordCardParts, RecordPart } from '../Records/types'

/** `h-16`, or `h-12` without a description, in rem. */
export const LIST_ROW_REM = 4
export const LIST_ROW_REM_COMPACT = 3

export const listRowRem = (parts: RecordCardParts) =>
  parts.description ? LIST_ROW_REM : LIST_ROW_REM_COMPACT

// Full literals for Tailwind's scanner; they match the constants above.
export const listRowHeightClass = (parts: RecordCardParts) =>
  parts.description ? 'h-16' : 'h-12'

// List rows size to their text; a window needs whole, fixed heights, so the content centres in them instead.
const fixedHeightClass =
  '[&>[data-slot=list-item-content]]:py-0 [&>[data-slot=list-item-leading]]:py-0'

export type RecordTableListRowProps = {
  id: string
  record: object
  parts: RecordCardParts
  timeZone: string
  /** One-based place in the whole list, when the list holds only some of its rows. */
  posInSet?: number
  /** The whole list's length, or -1 while unknown. */
  setSize?: number
  /** Undefined when the records can't be selected. */
  selected?: boolean
  selecting: boolean
  onToggle: (id: string, range: boolean) => void
  rowActions?: (row: object) => ReactNode
  href?: string
}

/** A record as one line of a list: leading, title and description, trailing. */
export const RecordTableListRow = memo(function RecordTableListRow({
  id,
  record,
  parts,
  timeZone,
  posInSet,
  setSize,
  selected,
  selecting,
  onToggle,
  rowActions,
  href: linkHref
}: RecordTableListRowProps) {
  // In Select mode the checkbox is the row's target, so the link steps aside.
  const href = selecting ? undefined : linkHref
  const name = recordTitle(record, id, parts.title)
  const value = (part: RecordPart | undefined) =>
    part && (
      <RecordPartValue
        part={part}
        row={record}
        timeZone={timeZone}
        className='min-w-0 truncate'
      />
    )
  const title = parts.title ? value(parts.title) : id
  const leading = value(parts.leading)
  return (
    <li
      data-slot='record-table-list-row'
      data-row-id={id}
      data-selected={selected || undefined}
      aria-posinset={posInSet}
      aria-setsize={setSize}
    >
      <div
        className={cn(
          listItemVariants({ interactive: false, selected: selected ?? false }),
          // Bleeds into the row's padding, as a subtler List does, so text lines up with the toolbar.
          '-mx-3',
          // Always on: adding it later animates the outline in from its dark default.
          'is-interactive-within',
          // The list zeroes it to join a selected next row.
          'rounded-b-[var(--record-table-row-join,var(--radius-xl))]',
          // Subtler paints a tint at rest unless a target makes it interactive.
          href === undefined && !selecting && !selected && 'bg-transparent',
          listRowHeightClass(parts),
          fixedHeightClass
        )}
      >
        <ListItemContent
          title={
            href === undefined ? (
              title
            ) : (
              <RoadieRoutedLink
                href={href}
                data-row-link=''
                data-interactive-target=''
                className='text-inherit no-underline'
              >
                {title}
              </RoadieRoutedLink>
            )
          }
          description={value(parts.description)}
          leading={
            selecting ? (
              // Takes the leading slot's place, at its size, so titles don't shift.
              <span
                className={cn('grid place-items-center', leading && 'size-10')}
              >
                <RecordsRowCheckbox
                  id={id}
                  title={name}
                  selected={selected ?? false}
                  onToggle={onToggle}
                  rowTarget
                />
              </span>
            ) : (
              leading
            )
          }
          trailing={value(parts.trailing)}
          chevron={href !== undefined}
        />
        {rowActions && (
          <div
            data-row-control
            className='relative z-docked flex shrink-0 items-center ps-2'
          >
            <RecordsRowActions
              title={name}
              row={record}
              rowActions={rowActions}
            />
          </div>
        )}
      </div>
    </li>
  )
})
RecordTableListRow.displayName = 'RecordTableListRow'
