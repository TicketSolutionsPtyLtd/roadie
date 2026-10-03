'use client'

import { type ReactNode, useLayoutEffect, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RecordsSearch } from './RecordsSearch'
import { useRecordsContext } from './context'
import { useStickyTop } from './stickyTop'
import { surfaceClass, useSurface } from './surface'

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
  const { setToolbar } = useRecordsContext()
  const ref = useRef<HTMLDivElement>(null)
  const top = useStickyTop(ref, null)
  useSurface(ref)

  // The content's header stacks under this height while both are stuck.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const height = element.offsetHeight
      setToolbar((held) =>
        // The first toolbar mounted keeps the place another one would take.
        (held?.element === element && held.height === height) ||
        (held && held.element !== element && held.element.isConnected)
          ? held
          : { element, height }
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
      setToolbar((held) => (held?.element === element ? null : held))
    }
  }, [setToolbar])

  return (
    <div
      ref={ref}
      data-slot='records-toolbar'
      style={{ top }}
      className={cn(
        // Its padding takes the place of the gap below, so the surface reaches the content while stuck.
        'sticky z-docked mb-[calc(var(--records-gap,0px)*-1)] flex flex-wrap items-center gap-2 pb-3',
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
