'use client'

import { type ReactNode, useLayoutEffect, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RecordsSearch } from './RecordsSearch'
import { useStickyTop } from './stickyTop'
import { surfaceClass } from './surface'

export type RecordsToolbarProps = {
  /** Replaces the standard controls, today the search. */
  children?: ReactNode
  /** The standard search's placeholder. @default 'Search' */
  searchPlaceholder?: string
  className?: string
}

/** The records' controls, sticking above the content as it scrolls. */
export function RecordsToolbar({
  children,
  searchPlaceholder,
  className
}: RecordsToolbarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const top = useStickyTop(ref, { underToolbar: false })

  // The content's header stacks under this height while both are stuck.
  useLayoutEffect(() => {
    const toolbar = ref.current
    const root = toolbar?.closest<HTMLElement>('[data-slot="records"]')
    if (!toolbar || !root) return
    const measure = () =>
      root.style.setProperty(
        '--records-toolbar-height',
        `${toolbar.offsetHeight}px`
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(toolbar)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--records-toolbar-height')
    }
  }, [])

  return (
    <div
      ref={ref}
      data-slot='records-toolbar'
      style={{ top }}
      className={cn(
        'sticky z-docked -mb-3 flex flex-wrap items-center gap-2 pb-3',
        surfaceClass,
        className
      )}
    >
      {children ?? (
        <RecordsSearch
          placeholder={searchPlaceholder}
          className='min-w-48 grow basis-64'
        />
      )}
    </div>
  )
}
RecordsToolbar.displayName = 'Records.Toolbar'
