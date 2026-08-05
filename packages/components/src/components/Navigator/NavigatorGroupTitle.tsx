import type { ComponentProps, ReactElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { navigatorGroupTitleVariants } from './variants'

export type NavigatorGroupTitleProps = ComponentProps<'h2'> & {
  /**
   * Replace the rendered element. The default `<h2>` matches `Pane.Header`
   * and `List.GroupTitle`, so it never collides with the page's `<h1>` —
   * pass `render` when the page's outline needs a different level.
   */
  render?: (props: ComponentProps<'h2'>) => ReactElement
}

/** Heading for a `Navigator.Group`. Declare it as the group's first child. */
export function NavigatorGroupTitle({
  className,
  render,
  ...props
}: NavigatorGroupTitleProps) {
  const resolved = {
    'data-slot': 'navigator-group-title',
    className: cn(navigatorGroupTitleVariants(), className),
    ...props
  }
  return render ? render(resolved) : <h2 {...resolved} />
}

NavigatorGroupTitle.displayName = 'Navigator.GroupTitle'
