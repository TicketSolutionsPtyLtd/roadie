import type { ComponentProps, ElementType } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { buttonVariants } from '../Button/Button'
import type { LinkButtonEmphasis, LinkButtonIntent } from './LinkButton'

export type LinkIconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

/**
 * Legacy size aliases — `'icon-*'` was the original API. Still accepted
 * but discouraged. New code should use plain `'sm'`, `'md'`, etc.
 *
 * @deprecated Use `'xs' | 'sm' | 'md' | 'lg'` instead.
 */
export type LinkIconButtonSizeLegacy =
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-md'
  | 'icon-lg'

const SIZE_MAP: Record<
  LinkIconButtonSize | LinkIconButtonSizeLegacy,
  'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg'
> = {
  xs: 'icon-xs',
  sm: 'icon-sm',
  md: 'icon-md',
  lg: 'icon-lg',
  'icon-xs': 'icon-xs',
  'icon-sm': 'icon-sm',
  'icon-md': 'icon-md',
  'icon-lg': 'icon-lg'
}

export type LinkIconButtonProps<T extends ElementType = 'a'> = {
  as?: T
  'aria-label': string
  /**
   * @default 'neutral'
   */
  intent?: LinkButtonIntent
  /**
   * @default 'normal'
   */
  emphasis?: LinkButtonEmphasis
  /**
   * Icon-button sizing. Use `'xs' | 'sm' | 'md' | 'lg'` (plain) — the
   * `'icon-*'` aliases are accepted for backwards compatibility but
   * discouraged.
   *
   * @default 'md'
   */
  size?: LinkIconButtonSize | LinkIconButtonSizeLegacy
  className?: string
} & Omit<
  ComponentProps<T>,
  'as' | 'aria-label' | 'intent' | 'emphasis' | 'size' | 'className'
>

/**
 * An icon-only link styled as a button.
 *
 * @deprecated Use `<IconButton href={…}>` instead and wire
 * `RoadieLinkProvider` at the app root for client-side routing. This
 * export remains for backwards compatibility and will be removed in
 * v3.0.0.
 */
export function LinkIconButton<T extends ElementType = 'a'>({
  as,
  className,
  intent,
  emphasis,
  size = 'md',
  ...props
}: LinkIconButtonProps<T>) {
  const Component = as || 'a'
  const mappedSize = SIZE_MAP[size]
  return (
    <Component
      data-slot='link-icon-button'
      className={cn(
        buttonVariants({ intent, emphasis, size: mappedSize, className })
      )}
      {...props}
    />
  )
}

LinkIconButton.displayName = 'LinkIconButton'
