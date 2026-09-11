import type { ComponentProps, ReactElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { listGroupTitleVariants } from './variants'

export type ListGroupTitleProps = ComponentProps<'h2'> & {
  /**
   * Replace the rendered element. The default `<h2>` matches `Pane.Header`,
   * so it never collides with the page's `<h1>` — pass `render` when the
   * page's outline needs a different level.
   */
  render?: (props: ComponentProps<'h2'>) => ReactElement
}

/** Label for a `List.Group`. Declare it as the group's first child. */
export function ListGroupTitle({
  className,
  render,
  ...props
}: ListGroupTitleProps) {
  const resolved = {
    'data-slot': 'list-group-title',
    className: cn(listGroupTitleVariants(), className),
    ...props
  }
  return render ? render(resolved) : <h2 {...resolved} />
}

ListGroupTitle.displayName = 'List.GroupTitle'
