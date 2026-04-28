'use client'

import { type ComponentProps, type ElementType, useId } from 'react'

import { ArrowRightIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { useRegisterTitleLabel } from './useRegisterTitleLabel'

type CarouselTitleLinkOwnProps<T extends ElementType> = {
  /**
   * Render the link as a custom element/component. Defaults to `<a>`.
   * Pass `as` to bypass `RoadieLinkProvider` routing — useful for non-
   * anchor elements or custom link wrappers.
   */
  as?: T
  /**
   * Pass an href to render the title as a routed anchor. Internal hrefs
   * route through the configured `RoadieLinkProvider`; external hrefs
   * (`http(s)://`, `//…`) render `<a target='_blank' rel='noopener noreferrer'>`;
   * `mailto:` / `tel:` / `sms:` render plain `<a>`.
   */
  href?: string
  /** Force external-link treatment when `href` is set. */
  external?: boolean
  /** Override the auto `target='_blank'` default on external hrefs. */
  target?: string
  /** Override the auto `rel='noopener noreferrer'` default on external hrefs. */
  rel?: string
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
  href,
  external,
  target,
  rel,
  ...props
}: CarouselTitleLinkProps<T>) {
  const generatedId = useId()
  const titleId = id ?? generatedId
  useRegisterTitleLabel(titleId)

  const sharedClassName = cn(
    'group/title is-interactive flex items-center gap-1 text-display-ui-5 text-strong',
    className
  )

  const trailingIcon = (
    <ArrowRightIcon
      weight='bold'
      className='size-5 text-subtle transition-transform group-hover/title:translate-x-1 group-hover/title:intent-accent'
    />
  )

  if (!as && href !== undefined) {
    return (
      <RoadieRoutedLink
        id={titleId}
        data-slot='carousel-title-link'
        className={sharedClassName}
        href={href}
        external={external}
        target={target}
        rel={rel}
        {...(props as Record<string, unknown>)}
      >
        {children}
        {trailingIcon}
      </RoadieRoutedLink>
    )
  }

  const Component = (as ?? 'a') as ElementType
  const passthroughProps = {
    ...(href !== undefined && { href }),
    ...(target !== undefined && { target }),
    ...(rel !== undefined && { rel }),
    ...props
  }
  return (
    <Component
      id={titleId}
      data-slot='carousel-title-link'
      className={sharedClassName}
      {...passthroughProps}
    >
      {children}
      {trailingIcon}
    </Component>
  )
}

CarouselTitleLink.displayName = 'Carousel.TitleLink'
