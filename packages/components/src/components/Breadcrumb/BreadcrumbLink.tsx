import type { ComponentProps, ElementType, ReactElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'

export type BreadcrumbLinkProps<T extends ElementType = 'a'> = {
  /**
   * @deprecated Use `render` instead. `as` will be removed in v3.0.0.
   */
  as?: T
  /**
   * Pass an href to render the link as a routed anchor. Internal hrefs
   * route through the configured `RoadieLinkProvider`; external hrefs
   * (`http(s)://`, `//…`) render `<a target='_blank' rel='noopener noreferrer'>`;
   * `mailto:` / `tel:` / `sms:` render plain `<a>`. `render` always
   * wins — pass it to bypass provider routing.
   */
  href?: string
  /**
   * Force external-link treatment when `href` is set. Has no effect
   * when `render` is set — the consumer's element owns its own
   * target/rel.
   */
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
  className?: string
} & Omit<ComponentProps<T>, 'as' | 'className' | 'render'>

/**
 * BreadcrumbLink stays server-safe — `RoadieRoutedLink` is the
 * `'use client'` boundary and only loads when `href` is set without
 * `render`. Pass `render` (element / component / function form) for
 * full control. The legacy `as` prop is `@deprecated`.
 */
export function BreadcrumbLink<T extends ElementType = 'a'>({
  as,
  className,
  href,
  external,
  target,
  rel,
  render,
  ...props
}: BreadcrumbLinkProps<T>): ReactElement {
  const finalClassName = cn(
    'text-subtle transition-colors hover:text-normal',
    className
  )

  if (render !== undefined) {
    return resolveRender(
      'a',
      {
        'data-slot': 'breadcrumb-link',
        className: finalClassName,
        ...(href !== undefined && { href }),
        ...(target !== undefined && { target }),
        ...(rel !== undefined && { rel }),
        ...(props as Record<string, unknown>)
      },
      render
    )
  }

  // Legacy `as` path — back-compat only.
  if (as) {
    const Component = as as ElementType
    const passthroughProps = {
      'data-slot': 'breadcrumb-link',
      className: finalClassName,
      ...(href !== undefined && { href }),
      ...(target !== undefined && { target }),
      ...(rel !== undefined && { rel }),
      ...(props as Record<string, unknown>)
    }
    return <Component {...passthroughProps} />
  }

  if (href !== undefined) {
    return (
      <RoadieRoutedLink
        data-slot='breadcrumb-link'
        className={finalClassName}
        href={href}
        external={external}
        target={target}
        rel={rel}
        {...(props as Record<string, unknown>)}
      />
    )
  }

  return (
    <a
      data-slot='breadcrumb-link'
      className={finalClassName}
      {...(props as ComponentProps<'a'>)}
    />
  )
}

BreadcrumbLink.displayName = 'Breadcrumb.Link'
