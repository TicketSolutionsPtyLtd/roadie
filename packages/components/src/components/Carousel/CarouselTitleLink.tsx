'use client'

import {
  type ComponentProps,
  type ElementType,
  type ReactElement,
  useId
} from 'react'

import { ArrowRightIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, useRender } from '../../utils/useRender'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { useRegisterTitleLabel } from './useRegisterTitleLabel'

type CarouselTitleLinkOwnProps<T extends ElementType> = {
  /**
   * @deprecated Use `render` instead. `as` will be removed in v3.0.0.
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
  /**
   * Escape hatch — swap the underlying element with full control over
   * the rendered shape.
   */
  render?: RoadieRenderProp
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
  render,
  ...props
}: CarouselTitleLinkProps<T>): ReactElement {
  const generatedId = useId()
  const titleId = id ?? generatedId
  useRegisterTitleLabel(titleId)

  const sharedClassName = cn(
    'group/title is-interactive flex items-center gap-1 text-display-ui-5 text-strong',
    className
  )

  const innerChildren = (
    <>
      {children}
      <ArrowRightIcon
        weight='bold'
        className='size-5 text-subtle transition-transform group-hover/title:translate-x-1 group-hover/title:intent-accent'
      />
    </>
  )

  if (render !== undefined) {
    return useRender(
      'a',
      {
        id: titleId,
        'data-slot': 'carousel-title-link',
        className: sharedClassName,
        ...(href !== undefined && { href }),
        ...(target !== undefined && { target }),
        ...(rel !== undefined && { rel }),
        ...(props as Record<string, unknown>),
        children: innerChildren
      },
      render
    )
  }

  // Legacy `as` path — back-compat only.
  if (as) {
    const Component = as as ElementType
    const passthroughProps = {
      id: titleId,
      'data-slot': 'carousel-title-link',
      className: sharedClassName,
      ...(href !== undefined && { href }),
      ...(target !== undefined && { target }),
      ...(rel !== undefined && { rel }),
      ...(props as Record<string, unknown>)
    }
    return <Component {...passthroughProps}>{innerChildren}</Component>
  }

  if (href !== undefined) {
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
        {innerChildren}
      </RoadieRoutedLink>
    )
  }

  return (
    <a
      id={titleId}
      data-slot='carousel-title-link'
      className={sharedClassName}
      {...(props as ComponentProps<'a'>)}
    >
      {innerChildren}
    </a>
  )
}

CarouselTitleLink.displayName = 'Carousel.TitleLink'
