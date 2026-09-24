'use client'

import type { RefAttributes } from 'react'

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'

import { cn } from '@oztix/roadie-core/utils'

import { avatarFallbackClass } from './variants'

export type AvatarFallbackProps = AvatarPrimitive.Fallback.Props &
  RefAttributes<HTMLSpanElement>

export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      data-slot='avatar-fallback'
      className={cn(avatarFallbackClass, className)}
      {...props}
    />
  )
}

AvatarFallback.displayName = 'Avatar.Fallback'
