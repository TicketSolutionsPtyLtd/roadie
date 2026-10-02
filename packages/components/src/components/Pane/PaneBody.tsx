'use client'

import { type ComponentProps, type ReactNode, Suspense } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneFallback } from './PaneFallback'

export type PaneBodyProps = ComponentProps<'div'> & {
  /** The skeleton shown while the body is suspended. Defaults to the pane's `loading`. */
  loading?: ReactNode
}

/** The pane's body: it fills the height the header leaves, and keeps the header on screen while a skeleton stands in. A direct child marked `data-pane-fill` takes the height the rest of the body leaves. */
export function PaneBody({
  loading,
  className,
  children,
  ...props
}: PaneBodyProps) {
  return (
    <div
      data-slot='pane-body'
      className={cn(
        'grow',
        // A column: a grown body's height won't resolve a child's percentage.
        'has-[>[data-pane-fill]]:flex has-[>[data-pane-fill]]:flex-col',
        '*:data-pane-fill:min-h-0 *:data-pane-fill:grow *:data-pane-fill:basis-0',
        className
      )}
      {...props}
    >
      <Suspense fallback={<PaneFallback loading={loading} />}>
        {children}
      </Suspense>
    </div>
  )
}

PaneBody.displayName = 'Pane.Body'
