'use client'

import {
  type ComponentProps,
  type ElementType,
  type ReactElement,
  useId
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { useRegisterTitleLabel } from './useRegisterTitleLabel'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export type CarouselTitleProps = ComponentProps<'h2'> & {
  /**
   * @deprecated Use `render` instead (e.g. `render={<h3 />}` to change the
   * heading level). `as` will be removed in v3.0.0.
   */
  as?: HeadingLevel
  /**
   * Escape hatch — render a different heading element/level with full control.
   * The carousel's accessible-name registration is preserved.
   */
  render?: RoadieRenderProp
}

export function CarouselTitle({
  as,
  render,
  className,
  children,
  id,
  ...props
}: CarouselTitleProps): ReactElement {
  const generatedId = useId()
  const titleId = id ?? generatedId
  useRegisterTitleLabel(titleId)

  const finalProps = {
    id: titleId,
    'data-slot': 'carousel-title',
    className: cn('text-display-ui-5 text-strong', className),
    children,
    ...props
  }

  if (render !== undefined) return resolveRender('h2', finalProps, render)

  const Component = (as ?? 'h2') as ElementType
  return <Component {...finalProps} />
}

CarouselTitle.displayName = 'Carousel.Title'
