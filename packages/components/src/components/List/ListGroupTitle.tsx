import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { listGroupTitleVariants } from './variants'

export type ListGroupTitleProps = ComponentProps<'h2'> & {
  /** Change the heading level, e.g. `render={<h3 />}`. Defaults to `<h2>`. */
  render?: RoadieRenderProp<ComponentProps<'h2'>>
}

/** Label for a `List.Group`. */
export function ListGroupTitle({
  className,
  render,
  ...props
}: ListGroupTitleProps) {
  return resolveRender(
    'h2',
    {
      'data-slot': 'list-group-title',
      className: cn(listGroupTitleVariants(), className),
      ...props
    },
    render
  )
}

ListGroupTitle.displayName = 'List.GroupTitle'
