'use client'

import { type ComponentProps, useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useRegisterTitleLabel } from './useRegisterTitleLabel'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export type CarouselTitleProps = ComponentProps<'h2'> & {
  /** Heading level. Defaults to `<h2>`. */
  as?: HeadingLevel
}

export function CarouselTitle({
  as: Component = 'h2',
  className,
  children,
  id,
  ...props
}: CarouselTitleProps) {
  const generatedId = useId()
  const titleId = id ?? generatedId
  useRegisterTitleLabel(titleId)

  return (
    <Component
      id={titleId}
      data-slot='carousel-title'
      className={cn('text-display-ui-5 text-strong', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

CarouselTitle.displayName = 'Carousel.Title'
