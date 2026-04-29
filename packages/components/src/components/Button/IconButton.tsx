'use client'

import { Button, type ButtonProps } from './Button'

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

/**
 * Legacy size aliases — `'icon-*'` was the original API. Still accepted
 * but discouraged. New code should use plain `'sm'`, `'md'`, etc.
 *
 * @deprecated Use `'xs' | 'sm' | 'md' | 'lg'` instead.
 */
export type IconButtonSizeLegacy = 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg'

export type IconButtonProps = Omit<ButtonProps, 'aria-label' | 'size'> & {
  'aria-label': string
  /**
   * Icon-button sizing. Use `'xs' | 'sm' | 'md' | 'lg'` (plain) — the
   * `'icon-*'` aliases are accepted for backwards compatibility but
   * discouraged.
   *
   * @default 'md'
   */
  size?: IconButtonSize | IconButtonSizeLegacy
}

const SIZE_MAP: Record<
  NonNullable<IconButtonProps['size']>,
  ButtonProps['size']
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

export function IconButton({ size = 'md', ...props }: IconButtonProps) {
  return <Button data-slot='icon-button' size={SIZE_MAP[size]} {...props} />
}

IconButton.displayName = 'IconButton'
