import {
  type ComponentProps,
  type ElementType,
  type ReactElement,
  isValidElement
} from 'react'

import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { cardVariants } from './variants'

type CardOwnProps<T extends ElementType = 'div'> = {
  /**
   * @deprecated Use `render` instead. `as` will be removed in v3.0.0.
   *
   * Pass `render={<button onClick=… />}` for a clickable card, or
   * `render={<MyLink href='/x' />}` for a custom link wrapper. The
   * `render` prop accepts an element, a component, or a function
   * `(defaultProps) => element` for full control.
   */
  as?: T
  /**
   * Pass an href to render the card as a routed anchor. Internal hrefs
   * route through the configured `RoadieLinkProvider`; external hrefs
   * (`http(s)://`, `//…`) render `<a target='_blank' rel='noopener noreferrer'>`;
   * `mailto:` / `tel:` / `sms:` render plain `<a>`. Use `external` to
   * override the auto classification.
   *
   * `render` always wins over `href` smart-routing — pass `render` to
   * render a non-anchor or to bypass provider routing.
   */
  href?: string
  /**
   * Force external-link treatment when `href` is set. Has no effect
   * when `render` is set — the consumer's element is responsible for
   * its own target/rel.
   */
  external?: boolean
  /** Override the auto `target='_blank'` default on external hrefs. */
  target?: string
  /** Override the auto `rel='noopener noreferrer'` default on external hrefs. */
  rel?: string
  /**
   * Escape hatch — swap the underlying element with full control over
   * the rendered shape. See [Linking](/foundations/linking) for the
   * full reference.
   */
  render?: RoadieRenderProp
} & VariantProps<typeof cardVariants>

export type CardRootProps<T extends ElementType = 'div'> = CardOwnProps<T> &
  Omit<ComponentProps<T>, keyof CardOwnProps<T>>

/**
 * Card root.
 *
 * Smart-href routing: when `href` is set without `render`, the card
 * delegates to `RoadieRoutedLink` so internal hrefs route through the
 * configured `RoadieLinkProvider`, external hrefs render
 * `<a target='_blank' rel>`, and protocol hrefs render plain `<a>`.
 *
 * Escape hatch: pass `render` (element, component, or function form) to
 * take over the rendered element. `render` always wins over `href`
 * smart-routing.
 *
 * The legacy `as` prop is `@deprecated` — use `render` instead.
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
  render,
  ...props
}: CardRootProps<T>): ReactElement {
  const rest = props as Record<string, unknown>

  // Detect interactivity from outer onClick OR from a render element
  // that itself carries onClick (e.g. `render={<button onClick=… />}`).
  // Without this, `<Card render={<button onClick={fn} />}>` would lose
  // is-interactive styling — cursor, focus ring, hover scale all drop.
  const renderElementOnClick =
    isValidElement(render) &&
    typeof (render.props as { onClick?: unknown } | null)?.onClick ===
      'function'
  const isInteractive =
    href !== undefined || !!rest.onClick || renderElementOnClick

  const finalClassName = cn(
    cardVariants({ intent, emphasis }),
    isInteractive && 'is-interactive',
    className
  )

  // `render` is the canonical escape hatch. When set, use it via
  // resolveRender for consistent prop merging.
  if (render !== undefined) {
    return resolveRender(
      'div',
      {
        'data-slot': 'card',
        className: finalClassName,
        ...(href !== undefined && { href }),
        ...(target !== undefined && { target }),
        ...(rel !== undefined && { rel }),
        ...rest
      },
      render
    )
  }

  // Legacy `as` path — back-compat only. Prefer `render` for new code.
  if (as) {
    const Component = as as ElementType
    const passthroughProps = {
      'data-slot': 'card',
      className: finalClassName,
      ...(href !== undefined && { href }),
      ...(target !== undefined && { target }),
      ...(rel !== undefined && { rel }),
      ...rest
    }
    return <Component {...passthroughProps} />
  }

  // Default routes: href → RoadieRoutedLink → routed anchor
  if (href !== undefined) {
    return (
      <RoadieRoutedLink
        data-slot='card'
        className={finalClassName}
        href={href}
        external={external}
        target={target}
        rel={rel}
        {...(rest as Record<string, unknown>)}
      />
    )
  }

  // Default — plain div
  return <div data-slot='card' className={finalClassName} {...props} />
}

CardRoot.displayName = 'Card.Root'
