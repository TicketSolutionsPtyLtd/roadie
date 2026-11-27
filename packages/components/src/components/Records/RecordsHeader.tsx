'use client'

import { type ReactNode, useRef, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useStickyPart } from '../../utils/stickyStack'
import { surfaceClass, useSurface } from '../../utils/surface'
import { RecordsActions } from './RecordsActions'
import { RecordsConfigure } from './RecordsOptions'
import { RecordsSearch } from './RecordsSearch'
import { RecordsSelect } from './RecordsSelect'
import {
  RecordsViewActions,
  type RecordsViewActionsProps
} from './RecordsViewActions'
import { useRecordsStable } from './context'
import { SearchFocusContext } from './searchFocus'
import { useLeaveSelectOnEscape } from './selectMode'
import type { RecordsAction } from './types'

export type RecordsHeaderProps<Row extends object = object> = {
  /** Replaces the standard controls: the search, the view actions, the options and the actions. */
  children?: ReactNode
  /** The standard search's placeholder. @default 'Search and filter' */
  searchPlaceholder?: string
  /** Names the standard search when its placeholder doesn't. */
  searchLabel?: string
  /** The key that focuses the standard search, a `KeyboardEvent.key` value such as `/`, or `false` for none. @default '/' */
  searchFocusShortcut?: string | false
  /** The standard controls' actions on every matching record, at the end as `Records.Actions`. */
  actions?: readonly RecordsAction<Row>[]
  /** The standard controls' view actions, after the search as `Records.ViewActions`. */
  viewActions?: RecordsViewActionsProps
  className?: string
}

/** The records' controls, sticking above the content as it scrolls. */
export function RecordsHeader<Row extends object>({
  children,
  searchPlaceholder,
  searchLabel,
  searchFocusShortcut,
  actions,
  viewActions,
  className
}: RecordsHeaderProps<Row>) {
  const { scope } = useRecordsStable()
  const leaveSelect = useLeaveSelectOnEscape()
  const ref = useRef<HTMLDivElement>(null)
  // The content's sticky parts stack under it while both are stuck.
  const top = useStickyPart(ref, {
    tier: 1,
    stack: scope,
    publishOn: '[data-slot="records"]'
  })
  useSurface(ref)
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <div
      ref={ref}
      data-slot='records-header'
      data-search-focused={searchFocused ? '' : undefined}
      style={{ top }}
      onKeyDown={leaveSelect}
      className={cn(
        // Its padding takes the place of the gap below, so the surface reaches the content while stuck.
        'sticky z-docked mb-[calc(var(--records-gap,0px)*-1)] flex flex-wrap items-start gap-2 pb-3',
        // Its controls fold by its room; 20rem stands in for their width, which containment drops.
        '@container/records-header [contain-intrinsic-inline-size:20rem]',
        // A narrow toolbar gives a focused search the row, the rest hidden from Tab and screen readers too.
        '@max-[40rem]:data-search-focused:*:not-data-[slot=records-search]:hidden',
        surfaceClass,
        className
      )}
    >
      <SearchFocusContext value={setSearchFocused}>
        {children ?? (
          <>
            <RecordsSearch
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              focusShortcut={searchFocusShortcut}
              className='min-w-40 grow basis-0'
            />
            <RecordsSelect />
            {viewActions && <RecordsViewActions {...viewActions} />}
            <RecordsConfigure />
            {actions && (
              <RecordsActions actions={actions} className='ms-auto' />
            )}
          </>
        )}
      </SearchFocusContext>
    </div>
  )
}
RecordsHeader.displayName = 'Records.Header'
