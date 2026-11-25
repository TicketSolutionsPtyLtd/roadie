'use client'

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { surfaceClass, useSurface } from '../../utils/surface'
import { RecordsActions } from './RecordsActions'
import { RecordsConfigure } from './RecordsOptions'
import { RecordsSearch } from './RecordsSearch'
import { RecordsSelect } from './RecordsSelect'
import {
  RecordsViewActions,
  type RecordsViewActionsProps
} from './RecordsViewActions'
import { useRecordsLayoutValue, useRecordsStable } from './context'
import { SearchFocusContext } from './searchFocus'
import { useLeaveSelectOnEscape } from './selectMode'
import { usePublishToolbarHeight, useStickyTop } from './stickyTop'
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
  const { setToolbar, scope } = useRecordsStable()
  const { toolbar } = useRecordsLayoutValue()
  const leaveSelect = useLeaveSelectOnEscape()
  const ref = useRef<HTMLDivElement>(null)
  const top = useStickyTop(ref, null, scope)
  useSurface(ref)
  const [searchFocused, setSearchFocused] = useState(false)

  // The content's header stacks under this toolbar while both are stuck.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    // The first toolbar mounted keeps the place another one would take.
    setToolbar((held) =>
      held && held !== element && held.isConnected ? held : element
    )
    return () => setToolbar((held) => (held === element ? null : held))
  }, [setToolbar])
  // Takes the place another toolbar left, which this one's own effect won't notice.
  useLayoutEffect(() => {
    const element = ref.current
    if (toolbar === null && element) setToolbar((held) => held ?? element)
  }, [toolbar, setToolbar])
  usePublishToolbarHeight(ref, toolbar, scope)

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
        // A container, so its controls fold by the room inside it. Containment
        // drops the controls' own width, so a parent sized by its content gets this.
        '@container [contain-intrinsic-inline-size:20rem]',
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
