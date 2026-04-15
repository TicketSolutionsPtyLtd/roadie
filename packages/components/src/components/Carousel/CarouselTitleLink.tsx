'use client'

import { type ComponentProps, type ElementType, useId } from 'react'

import { ArrowRightIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { useRegisterTitleLabel } from './useRegisterTitleLabel'

type CarouselTitleLinkOwnProps<T extends ElementType> = {
  /**
   * Render the link as a custom element/component (e.g. Next.js `Link`).
   * Defaults to `<a>`.
   */
  as?: T
  /** DOM id for `aria-labelledby`. Defaults to a generated id. */
  id?: string
}

export type CarouselTitleLinkProps<T extends ElementType = 'a'> =
  CarouselTitleLinkOwnProps<T> &
    Omit<ComponentProps<T>, keyof CarouselTitleLinkOwnProps<T>>

export function CarouselTitleLink<T extends ElementType = 'a'>({
  as,
  className,
  children,
  id,
  ...props
}: CarouselTitleLinkProps<T>) {
  const generatedId = useId()
  const titleId = id ?? generatedId
  useRegisterTitleLabel(titleId)

  const Component = (as ?? 'a') as ElementType

  return (
    <Component
      id={titleId}
      data-slot='carousel-title-link'
      className={cn(
        'group/title is-interactive flex items-center gap-1 text-display-ui-5 text-strong',
        className
      )}
      {...props}
    >
      {children}
      <ArrowRightIcon
        weight='bold'
        className='size-5 text-subtle transition-transform group-hover/title:translate-x-1 group-hover/title:intent-accent'
      />
    </Component>
  )
}

CarouselTitleLink.displayName = 'Carousel.TitleLink'
