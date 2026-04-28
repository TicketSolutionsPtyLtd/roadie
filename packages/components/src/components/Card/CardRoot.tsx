import type { ComponentProps, ElementType } from 'react'

import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { cardVariants } from './variants'

type CardOwnProps<T extends ElementType = 'div'> = {
  as?: T
  /**
   * Pass an href to render the card as a routed anchor. Internal hrefs
   * route through the configured `RoadieLinkProvider`; external hrefs
   * (`http(s)://`, `//…`) render `<a target='_blank' rel='noopener noreferrer'>`;
   * `mailto:` / `tel:` / `sms:` render plain `<a>`. Use `external` to
   * override the auto classification.
   *
   * `as` always wins over `href` smart-routing — pass `as` to render a
   * non-anchor or to bypass provider routing.
   */
  href?: string
  /** Force external-link treatment when `href` is set. */
  external?: boolean
  /** Override the auto `target='_blank'` default on external hrefs. */
  target?: string
  /** Override the auto `rel='noopener noreferrer'` default on external hrefs. */
  rel?: string
} & VariantProps<typeof cardVariants>

export type CardRootProps<T extends ElementType = 'div'> = CardOwnProps<T> &
  Omit<ComponentProps<T>, keyof CardOwnProps<T>>

/**
 * Card root.
 *
 * Smart-href routing: when `href` is set without `as`, the card delegates
 * to `RoadieRoutedLink` so internal hrefs route through the configured
 * `RoadieLinkProvider`, external hrefs render `<a target='_blank' rel>`,
 * and protocol hrefs render plain `<a>`. The `as` prop, when set, always
 * wins — `<Card as='button' onClick={…}>` keeps button semantics, and
 * `<Card as={MyCustomLink} href='/x'>` renders `MyCustomLink` directly,
 * bypassing provider routing (useful for non-anchor elements or custom
 * link wrappers).
 *
 * `CardRoot` itself stays server-safe — `RoadieRoutedLink` is the
 * `'use client'` boundary and only loads when `href` is actually set.
 */
export function CardRoot<T extends ElementType = 'div'>({
  as,
  className,
  intent,
  emphasis,
  href,
  external,
  target,
  rel,
  ...props
}: CardRootProps<T>) {
  const rest = props as Record<string, unknown>
  const isInteractive = href !== undefined || !!rest.onClick

  // `as` always wins (back-compat + escape hatch). When absent and `href`
  // is set, route through RoadieRoutedLink. Otherwise default to `<div>`.
  if (!as && href !== undefined) {
    return (
      <RoadieRoutedLink
        data-slot='card'
        className={cn(
          cardVariants({ intent, emphasis }),
          'is-interactive',
          className
        )}
        href={href}
        external={external}
        target={target}
        rel={rel}
        {...(rest as Record<string, unknown>)}
      />
    )
  }

  const Component = as || 'div'
  // Forward href (and target/rel) when an explicit `as` is set — preserves
  // the existing `<Card as='a' href='/x'>` API exactly.
  const passthroughProps = {
    ...(href !== undefined && { href }),
    ...(target !== undefined && { target }),
    ...(rel !== undefined && { rel }),
    ...props
  }
  return (
    <Component
      data-slot='card'
      className={cn(
        cardVariants({ intent, emphasis }),
        isInteractive && 'is-interactive',
        className
      )}
      {...passthroughProps}
    />
  )
}

CardRoot.displayName = 'Card.Root'
