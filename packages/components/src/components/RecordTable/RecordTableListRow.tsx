import { type ReactNode, memo, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { ListItemContent } from '../List/ListItemContent'
import { listItemVariants } from '../List/variants'
import { recordTitle } from '../Records/RecordCard'
import { RecordPartValue } from '../Records/RecordPartValue'
import { RecordsRowActions } from '../Records/RecordsRowActions'
import { RecordsSelectModeCheckbox } from '../Records/RecordsRowCheckbox'
import type { RecordCardParts, RecordPart } from '../Records/types'
import { listRowSize } from './rowSizing'
import { useKeepFocusInTable } from './tableFocus'

// List rows size to their text; a window needs whole, fixed heights, so the content centres in them instead.
const fixedHeightClass =
  '[&>[data-slot=list-item-content]]:py-0 [&>[data-slot=list-item-leading]]:py-0'

export type RecordTableListRowProps = {
  id: string
  row: object
  parts: RecordCardParts
  /** The viewer's zone, for dates. */
  timeZone?: string
  /** One-based place in the whole list, when the list holds only some of its rows. */
  posInSet?: number
  /** The whole list's length, or -1 while unknown. */
  setSize?: number
  /** Undefined when the records can't be selected. */
  selected?: boolean
  /** Select mode: a checkbox takes the leading slot and covers the row. */
  selecting?: boolean
  onToggle?: (id: string, range: boolean) => void
  rowActions?: (row: object) => ReactNode
  href?: string
  /** Reaches into the space beside the list, as a subtler List does, so text lines up with the toolbar. Off in a box of its own, which would clip it. */
  bleed: boolean
}

/** A record as one line of a list: leading, title and description, trailing. */
export const RecordTableListRow = memo(function RecordTableListRow({
  id,
  row,
  parts,
  timeZone,
  posInSet,
  setSize,
  selected,
  selecting = false,
  onToggle,
  rowActions,
  href: linkHref,
  bleed
}: RecordTableListRowProps) {
  // In Select mode the checkbox is the row's target, so the link steps aside.
  const itemRef = useRef<HTMLLIElement>(null)
  useKeepFocusInTable(itemRef)
  const href = selecting ? undefined : linkHref
  const name = recordTitle(row, id, parts.title, timeZone)
  const value = (part: RecordPart | undefined) =>
    part && (
      <RecordPartValue
        part={part}
        row={row}
        timeZone={timeZone}
        className='min-w-0 truncate'
      />
    )
  const title = parts.title ? value(parts.title) : id
  const leading = value(parts.leading)
  return (
    <li
      ref={itemRef}
      data-slot='record-table-list-row'
      data-row-id={id}
      data-selected={selected || undefined}
      aria-posinset={posInSet}
      aria-setsize={setSize}
    >
      <div
        className={cn(
          listItemVariants({ interactive: false, selected: selected ?? false }),
          bleed ? '-mx-3' : 'mx-0',
          // Always on: adding it later animates the outline in from its dark default.
          'is-interactive-within',
          // The list zeroes it to join a selected next row.
          'rounded-b-[var(--record-table-row-join,var(--radius-xl))]',
          // Subtler paints a tint at rest unless a target makes it interactive.
          href === undefined && !selecting && !selected && 'bg-transparent',
          listRowSize(parts).heightClass,
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
              <RecordsSelectModeCheckbox
                id={id}
                title={name}
                selected={selected ?? false}
                onToggle={(toggled, range) => onToggle?.(toggled, range)}
                thumbnail={parts.leading?.kind === 'image'}
              />
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
            <RecordsRowActions title={name} row={row} rowActions={rowActions} />
          </div>
        )}
      </div>
    </li>
  )
})
RecordTableListRow.displayName = 'RecordTableListRow'
