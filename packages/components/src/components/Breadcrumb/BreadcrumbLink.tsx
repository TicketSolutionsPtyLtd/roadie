import type { ComponentProps, ElementType } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'

export type BreadcrumbLinkProps<T extends ElementType = 'a'> = {
  as?: T
  /**
   * Pass an href to render the link as a routed anchor. Internal hrefs
   * route through the configured `RoadieLinkProvider`; external hrefs
   * (`http(s)://`, `//…`) render `<a target='_blank' rel='noopener noreferrer'>`;
   * `mailto:` / `tel:` / `sms:` render plain `<a>`. `as` always wins —
   * pass it to bypass provider routing.
   */
  href?: string
  /** Force external-link treatment when `href` is set. */
  external?: boolean
  /** Override the auto `target='_blank'` default on external hrefs. */
  target?: string
  /** Override the auto `rel='noopener noreferrer'` default on external hrefs. */
  rel?: string
  className?: string
} & Omit<ComponentProps<T>, 'as' | 'className'>

/**
 * BreadcrumbLink stays server-safe — `RoadieRoutedLink` is the
 * `'use client'` boundary and only loads when `href` is set without
 * `as`. The `as` prop is the documented escape hatch for non-Base-UI
 * polymorphism (BASE_UI.md §3) and always wins over `href` smart
 * routing.
 */
export function BreadcrumbLink<T extends ElementType = 'a'>({
  as,
  className,
  href,
  external,
  target,
  rel,
  ...props
}: BreadcrumbLinkProps<T>) {
  const linkClassName = cn(
    'text-subtle transition-colors hover:text-normal',
    className
  )

  if (!as && href !== undefined) {
    return (
      <RoadieRoutedLink
        data-slot='breadcrumb-link'
        className={linkClassName}
        href={href}
        external={external}
        target={target}
        rel={rel}
        {...(props as Record<string, unknown>)}
      />
    )
  }

  const Component = as || 'a'
  const passthroughProps = {
    ...(href !== undefined && { href }),
    ...(target !== undefined && { target }),
    ...(rel !== undefined && { rel }),
    ...props
  }
  return (
    <Component
      data-slot='breadcrumb-link'
      className={linkClassName}
      {...passthroughProps}
    />
  )
}

BreadcrumbLink.displayName = 'Breadcrumb.Link'
