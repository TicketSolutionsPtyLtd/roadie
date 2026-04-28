'use client'

import {
  type ComponentProps,
  type ElementType,
  type ReactElement,
  cloneElement,
  useId
} from 'react'

import { ArrowRightIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
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

  const trailingIcon = (
    <ArrowRightIcon
      weight='bold'
      className='size-5 text-subtle transition-transform group-hover/title:translate-x-1 group-hover/title:intent-accent'
    />
  )

  if (render !== undefined) {
    // Build the rendered element first with the consumer's text as
    // children. Then re-clone to APPEND the decorative trailing icon so
    // a render override that carries its own children
    // (e.g. `render={<NextLink>See all</NextLink>}`) keeps the icon —
    // mergeProps' "override wins" rule would otherwise drop it.
    const baseElement = resolveRender(
      'a',
      {
        id: titleId,
        'data-slot': 'carousel-title-link',
        className: sharedClassName,
        ...(href !== undefined && { href }),
        ...(target !== undefined && { target }),
        ...(rel !== undefined && { rel }),
        ...(props as Record<string, unknown>),
        children
      },
      render
    )
    const baseProps = baseElement.props as { children?: React.ReactNode }
    return cloneElement(
      baseElement,
      undefined,
      baseProps.children,
      trailingIcon
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
    return (
      <Component {...passthroughProps}>
        {children}
        {trailingIcon}
      </Component>
    )
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
        {children}
        {trailingIcon}
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
      {children}
      {trailingIcon}
    </a>
  )
}

CarouselTitleLink.displayName = 'Carousel.TitleLink'
