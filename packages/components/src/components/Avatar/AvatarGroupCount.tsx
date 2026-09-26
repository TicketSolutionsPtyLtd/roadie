'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { AvatarGroupContext } from './AvatarGroupContext'
import {
  type AvatarShape,
  type AvatarSize,
  avatarFallbackClass,
  avatarVariants
} from './variants'

export type AvatarGroupCountProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** How many people the group doesn't show. Renders as `+N`. */
  count: number
  /** Inherits from `Avatar.Group`, else `md`. */
  size?: AvatarSize
  /** Inherits from `Avatar.Group`, else `circle`. */
  shape?: AvatarShape
  intent?: RoadieIntent
}

/** The last item in an `Avatar.Group`. Announced as "N more" unless `aria-label` says otherwise. */
export function AvatarGroupCount({
  className,
  count,
  size,
  shape,
  intent,
  'aria-label': ariaLabel,
  ...props
}: AvatarGroupCountProps) {
  const group = use(AvatarGroupContext)
  return (
    <span
      data-slot='avatar-group-count'
      role='img'
      aria-label={ariaLabel ?? `${count} more`}
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
      <span
        aria-hidden
        className={cn(
          avatarFallbackClass,
          'text-[length:32cqi] tracking-tight tabular-nums'
        )}
      >
        +{count}
      </span>
    </span>
  )
}

AvatarGroupCount.displayName = 'Avatar.GroupCount'
