import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type AvatarShape = 'circle' | 'square'

// Boxes and square radii match IconTile so the two line up in a row.
// `@container` lets initials and the icon scale with any size, custom ones too.
// The subtle fallback is translucent; `bg-normal` keeps overlapping avatars opaque.
export const avatarVariants = cva(
  '@container relative inline-grid shrink-0 overflow-hidden bg-normal align-middle select-none *:[grid-area:1/1]',
  {
    variants: {
      intent: intentVariants,
      size: {
        xs: 'size-6',
        sm: 'size-8',
        md: 'size-10',
        lg: 'size-12',
        xl: 'size-14'
      },
      shape: {
        circle: 'rounded-full',
        square: ''
      }
    },
    compoundVariants: [
      { shape: 'square', size: 'xs', className: 'rounded-md' },
      { shape: 'square', size: 'sm', className: 'rounded-lg' },
      { shape: 'square', size: 'md', className: 'rounded-xl' },
      { shape: 'square', size: 'lg', className: 'rounded-xl' },
      { shape: 'square', size: 'xl', className: 'rounded-2xl' }
    ],
    defaultVariants: { size: 'md', shape: 'circle' }
  }
)

export const avatarFallbackClass =
  'grid size-full place-items-center rounded-[inherit] border-subtle emphasis-subtle text-[length:38cqi] leading-none font-semibold [&_svg]:size-1/2'

export const avatarImageClass =
  'size-full rounded-[inherit] object-cover data-[error]:invisible data-[loading]:invisible'

// Overlap is a fifth of the avatar at every size.
export const avatarGroupVariants = cva(
  'flex items-center [--avatar-ring:var(--intent-bg-normal)] *:ring-2 *:ring-(--avatar-ring)',
  {
    variants: {
      size: {
        xs: '*:not-first:-ms-1',
        sm: '*:not-first:-ms-1.5',
        md: '*:not-first:-ms-2',
        lg: '*:not-first:-ms-2.5',
        xl: '*:not-first:-ms-3'
      }
    },
    defaultVariants: { size: 'md' }
  }
)
