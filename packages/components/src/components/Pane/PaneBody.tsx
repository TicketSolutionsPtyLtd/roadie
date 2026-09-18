'use client'

import { type ReactNode, Suspense } from 'react'

import { PaneFallback } from './PaneFallback'

export type PaneBodyProps = {
  /** The skeleton shown while the body is suspended. Defaults to the pane's `loading`. */
  loading?: ReactNode
  children?: ReactNode
}

/** The part of a pane that waits, keeping the header on screen while a skeleton stands in. */
export function PaneBody({ loading, children }: PaneBodyProps) {
  return (
    <Suspense fallback={<PaneFallback loading={loading} />}>
      {children}
    </Suspense>
  )
}

PaneBody.displayName = 'Pane.Body'
