'use client'

import { type RefAttributes, use } from 'react'

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { UserIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { AvatarFallback } from './AvatarFallback'
import { AvatarGroupContext } from './AvatarGroupContext'
import { AvatarImage } from './AvatarImage'
import { getInitials } from './getInitials'
import { type AvatarShape, type AvatarSize, avatarVariants } from './variants'

export type AvatarRootProps = AvatarPrimitive.Root.Props &
  RefAttributes<HTMLSpanElement> & {
    /** Inherits from `Avatar.Group`, else `md`. */
    size?: AvatarSize
    /** Inherits from `Avatar.Group`, else `circle`. */
    shape?: AvatarShape
    /** Colours the fallback; inherits from context when unset. */
    intent?: RoadieIntent
    /** Image URL. Used when there are no children. */
    src?: string
    /** Person's name. Gives the fallback its initials and the avatar its name. */
    name?: string
    /** Accessible name, over `name`. Pass `''` when the name is already beside it. */
    alt?: string
  }

export function AvatarRoot({
  className,
  size,
  shape,
  intent,
  src,
  name,
  alt,
  children,
  ...props
}: AvatarRootProps) {
  const group = use(AvatarGroupContext)
  const label = alt ?? name ?? ''
  const initials = name ? getInitials(name) : ''

  return (
    <AvatarPrimitive.Root
      data-slot='avatar'
      className={cn(
        avatarVariants({
          intent,
          size: size ?? group.size,
          shape: shape ?? group.shape
        }),
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <AvatarFallback
            role={label ? 'img' : undefined}
            aria-label={label || undefined}
            aria-hidden={label ? undefined : true}
          >
            {initials || <UserIcon weight='bold' aria-hidden />}
          </AvatarFallback>
          {src ? <AvatarImage src={src} alt={label} /> : null}
        </>
      )}
    </AvatarPrimitive.Root>
  )
}

AvatarRoot.displayName = 'Avatar.Root'
