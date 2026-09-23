'use client'

import { type ComponentProps, type ReactNode, Suspense } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneFallback } from './PaneFallback'

export type PaneBodyProps = ComponentProps<'div'> & {
  /** The skeleton shown while the body is suspended. Defaults to the pane's `loading`. */
  loading?: ReactNode
}

/** The pane's body: it fills the height the header leaves, and keeps the header on screen while a skeleton stands in. */
export function PaneBody({
  loading,
  className,
  children,
  ...props
}: PaneBodyProps) {
  return (
    <div data-slot='pane-body' className={cn('grow', className)} {...props}>
      <Suspense fallback={<PaneFallback loading={loading} />}>
        {children}
      </Suspense>
    </div>
  )
}

PaneBody.displayName = 'Pane.Body'
