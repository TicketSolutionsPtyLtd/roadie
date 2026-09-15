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

/**
 * The view's heading, placed in the pane's scrolling content so it scrolls
 * away as the reader moves down — the arrangement iOS uses for large titles.
 *
 * The header keeps a constant height and cross-fades in a compact echo of this
 * text instead. Nothing resizes at all, so no layout property is animated —
 * an in-header `Pane.Title` still has to close its own row to reclaim the
 * space, and animates `grid-template-rows` to do it smoothly.
 *
 * Defaults to `<h1>` rather than `Pane.Title`'s `<h2>`: a content-placed title
 * is the view's own heading, with no page heading above it to collide with.
 */
export function PaneBodyTitle({
  className,
  children,
  render,
  ...props
}: PaneBodyTitleProps) {
  const pane = use(PaneContext)
  const setBodyTitle = pane?.setBodyTitle

  // From an effect, never render: React 19 double-invokes render in
  // StrictMode, and a parent cannot be written to while a child renders.
  // Layout, not passive: a passive effect registers after first paint, so the
  // header (which renders `null` until `bodyTitle` is set) would commit
  // headerless, then pop in on the next frame and shove the content down.
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
