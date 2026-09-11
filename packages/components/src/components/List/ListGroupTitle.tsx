import type { ComponentProps, ReactElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { listGroupTitleVariants } from './variants'

export type ListGroupTitleProps = ComponentProps<'h2'> & {
  /** Replace the default `<h2>`, e.g. for a different heading level. */
  render?: (props: ComponentProps<'h2'>) => ReactElement
}

/** Label for a `List.Group`. */
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
