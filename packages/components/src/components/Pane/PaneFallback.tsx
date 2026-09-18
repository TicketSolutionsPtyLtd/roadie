'use client'

import { type ReactNode, use, useEffect } from 'react'

import { usePendingNavigationStore } from '../../providers/PendingNavigationContext'
import { Skeleton } from '../Skeleton'
import { PaneContext } from './PaneContext'
import { PaneHeader } from './PaneHeader'
import { PaneTitle } from './PaneTitle'

const defaultLoading = (
  <div className='grid gap-3 pb-4'>
    <Skeleton shape='block' className='h-40' />
    <Skeleton className='w-2/3' />
    <Skeleton className='w-1/2' />
  </div>
)

const skeletonHeader = (
  <PaneHeader>
    <PaneTitle>
      <Skeleton className='w-40' />
    </PaneTitle>
  </PaneHeader>
)

type PaneFallbackProps = {
  /** Stands in for the header too, for a boundary that holds it back. */
  header?: boolean
  /** Wins over the pane's `loading`. */
  loading?: ReactNode
}

/** What a pane shows while its content is suspended. Mounted, it holds the frame's pending indicator. */
export function PaneFallback({ header = false, loading }: PaneFallbackProps) {
  const pane = use(PaneContext)
  const store = usePendingNavigationStore()
  useEffect(() => store?.hold(), [store])

  return (
    <>
      {header ? skeletonHeader : null}
      <div data-slot='pane-loading' aria-busy='true'>
        {loading ?? pane?.loading ?? defaultLoading}
      </div>
    </>
  )
}
