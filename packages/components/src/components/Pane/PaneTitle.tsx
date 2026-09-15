'use client'

import { type ComponentProps, type ReactElement, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneContext } from './PaneContext'
import { PaneTitleCompact } from './PaneTitleCompact'
import { paneTitleVariants } from './variants'

export type PaneTitleProps = ComponentProps<'h2'> & {
  /**
   * Replace the rendered element. The default `<h2>` matches
   * `List.GroupTitle` and `Navigator.GroupTitle`, so it never collides with
   * the page's `<h1>` — pass `render` when the page's outline needs a
   * different level. Only replaces the heading; the compact echo Pane.Title
   * also renders is unaffected.
   */
  render?: (props: ComponentProps<'h2'>) => ReactElement
}

/**
 * Rendered as an `<h2>` by default so it never collides with the page's own
 * `<h1>` — pass `render` to change the element.
 *
 * Inside a `Pane`, also emits a compact echo that fades into the header's top
 * row as the pane scrolls, and scrolls the pane back to the top when tapped.
 * The two are separate elements rather than one that travels: they sit in
 * different grid cells, and crossing between them on transform alone would
 * need measured endpoints and a `ResizeObserver` on every neighbour.
 *
 * The `<h2>` stays the heading; the echo is a button labelled for what it
 * does, with its own text hidden, so assistive tech hears one heading and one
 * purposeful control rather than the same words twice.
 *
 * Must be a **direct child** of `Pane.Header` — the echo places itself in the
 * header's grid, and grid placement only reaches direct children, same as
 * `Pane.Actions`.
 */
export function PaneTitle({
  className,
  children,
  render,
  ...props
}: PaneTitleProps) {
  const pane = use(PaneContext)
  const collapsible = pane !== null
  const collapsed = pane?.collapsed ?? false

  const resolved = {
    'data-slot': 'pane-title',
    className: cn(paneTitleVariants({ collapsible, collapsed }), className),
    children: collapsible ? (
      // A clipping item, or the row can't shrink below its content.
      <span className='overflow-hidden'>{children}</span>
    ) : (
      children
    ),
    ...props
  }

  return (
    <>
      {render ? render(resolved) : <h2 {...resolved} />}
      <PaneTitleCompact>{children}</PaneTitleCompact>
    </>
  )
}

PaneTitle.displayName = 'Pane.Title'
