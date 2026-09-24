'use client'

import type { RefAttributes } from 'react'

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'

import { cn } from '@oztix/roadie-core/utils'

import { avatarImageClass } from './variants'

export type AvatarImageProps = AvatarPrimitive.Image.Props &
  RefAttributes<HTMLImageElement>

/**
 * Stays mounted so the image is in server HTML and `loading='lazy'` works; it
 * stays hidden over the fallback until it loads.
 */
export function AvatarImage({
  className,
  keepMounted = true,
  ...props
}: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image
      data-slot='avatar-image'
      keepMounted={keepMounted}
      className={cn(avatarImageClass, className)}
      {...props}
    />
  )
}

AvatarImage.displayName = 'Avatar.Image'
