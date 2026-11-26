import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { emptyStateTitleClass } from './variants'

export type EmptyStateTitleProps = ComponentProps<'h2'> & {
  /** Change the heading level, e.g. `render={<h1 />}`. Defaults to `<h2>`. */
  render?: RoadieRenderProp
}

export function EmptyStateTitle({
  className,
  render,
  ...props
}: EmptyStateTitleProps) {
  return resolveRender(
    'h2',
    {
      'data-slot': 'empty-state-title',
      className: cn(emptyStateTitleClass, className),
      ...props
    },
    render
  )
}

EmptyStateTitle.displayName = 'EmptyState.Title'
