'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { EmptyStateContext } from './EmptyStateContext'
import { emptyStateTitleVariants } from './variants'

export type EmptyStateTitleProps = ComponentProps<'h2'> & {
  /** Change the heading level, e.g. `render={<h1 />}`. Defaults to `<h2>`. */
  render?: RoadieRenderProp
}

export function EmptyStateTitle({
  className,
  render,
  ...props
}: EmptyStateTitleProps) {
  const size = use(EmptyStateContext)
  return resolveRender(
    'h2',
    {
      'data-slot': 'empty-state-title',
      className: cn(emptyStateTitleVariants({ size }), className),
      ...props
    },
    render
  )
}

EmptyStateTitle.displayName = 'EmptyState.Title'
