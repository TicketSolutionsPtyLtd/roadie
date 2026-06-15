import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

/**
 * A tile that frames a single Phosphor icon.
 *
 * The `size` tiers (`xs`–`3xl`) are CVA variant keys, not Tailwind utilities —
 * each maps to a numeric `size-*` box on the tile, with matching internal
 * padding and icon size (tile size = 2 × padding + icon size). The `size-*`
 * utility lives on the tile, not the icon — the icon is sized via a descendant
 * selector so consumers can pass a bare icon as children.
 *
 * `shape` is `circle` by default; `square` uses a size-proportional radius.
 *
 * Icons rendered inside a tile should use `weight='bold'` or `weight='duotone'`.
 */
export const iconTileVariants = cva(
  'inline-flex items-center justify-center [&_svg]:shrink-0',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        strong: 'emphasis-strong',
        normal: 'emphasis-normal text-subtle',
        subtle: 'emphasis-subtle text-subtle',
        subtler: 'emphasis-subtler text-subtle'
      },
      size: {
        xs: 'size-6 p-1 [&_svg]:size-4',
        sm: 'size-8 p-1.5 [&_svg]:size-5',
        md: 'size-10 p-2 [&_svg]:size-6',
        lg: 'size-12 p-2.5 [&_svg]:size-7',
        xl: 'size-14 p-3 [&_svg]:size-8',
        '2xl': 'size-16 p-3.5 [&_svg]:size-9',
        '3xl': 'size-20 p-4 [&_svg]:size-12'
      },
      shape: {
        circle: 'rounded-full',
        square: ''
      }
    },
    // Square radius scales with the tile so the corners stay in proportion
    // (~25–30% of the box). Circle ignores these — it's always rounded-full.
    compoundVariants: [
      { shape: 'square', size: 'xs', className: 'rounded-md' },
      { shape: 'square', size: 'sm', className: 'rounded-lg' },
      { shape: 'square', size: 'md', className: 'rounded-xl' },
      { shape: 'square', size: 'lg', className: 'rounded-xl' },
      { shape: 'square', size: 'xl', className: 'rounded-2xl' },
      { shape: 'square', size: '2xl', className: 'rounded-2xl' },
      { shape: 'square', size: '3xl', className: 'rounded-3xl' }
    ],
    defaultVariants: {
      emphasis: 'subtle',
      size: 'md',
      shape: 'circle'
    }
  }
)

export interface IconTileProps
  extends ComponentProps<'div'>,
    VariantProps<typeof iconTileVariants> {}

export function IconTile({
  className,
  intent,
  emphasis,
  size,
  shape,
  children,
  ...props
}: IconTileProps) {
  return (
    <div
      data-slot='icon-tile'
      className={cn(
        iconTileVariants({ intent, emphasis, size, shape, className })
      )}
      {...props}
    >
      {children}
    </div>
  )
}

IconTile.displayName = 'IconTile'
