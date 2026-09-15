'use client'

import { type ComponentProps, type ReactElement, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { PaneContext } from './PaneContext'
import { paneBodyTitleClass } from './variants'

export type PaneBodyTitleProps = ComponentProps<'h1'> & {
  /** Replace the rendered element. */
  render?: (props: ComponentProps<'h1'>) => ReactElement
}

/** The view's h1, in the scrolling content; the header echoes it once scrolled away. */
export function PaneBodyTitle({
  className,
  children,
  render,
  ...props
}: PaneBodyTitleProps) {
  const pane = use(PaneContext)
  const setBodyTitle = pane?.setBodyTitle

  // Layout, not passive: a passive effect paints the header late and shoves content down.
  useIsomorphicLayoutEffect(() => {
    if (!setBodyTitle) return
    setBodyTitle(children)
    return () => setBodyTitle(null)
  }, [setBodyTitle, children])

  const resolved = {
    'data-slot': 'pane-body-title',
    className: cn(paneBodyTitleClass, className),
    children,
    ...props
  }

  return render ? render(resolved) : <h1 {...resolved} />
}

PaneBodyTitle.displayName = 'Pane.BodyTitle'
