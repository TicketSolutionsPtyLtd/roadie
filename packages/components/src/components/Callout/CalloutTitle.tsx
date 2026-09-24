import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'

export type CalloutTitleProps = ComponentProps<'p'> & {
  /** Make the title a heading at the level the page needs, e.g. `render={<h3 />}`. Defaults to `<p>`. */
  render?: RoadieRenderProp
}

export function CalloutTitle({
  className,
  render,
  ...props
}: CalloutTitleProps) {
  return resolveRender(
    'p',
    {
      'data-slot': 'callout-title',
      className: cn('col-start-2 row-start-1 font-semibold', className),
      ...props
    },
    render
  )
}

CalloutTitle.displayName = 'Callout.Title'
