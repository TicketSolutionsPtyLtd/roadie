'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { AvatarGroupContext } from './AvatarGroupContext'
import {
  type AvatarShape,
  type AvatarSize,
  avatarGroupVariants
} from './variants'

export type AvatarGroupProps = ComponentProps<'div'> & {
  /** Size of every avatar in the group. @default 'md' */
  size?: AvatarSize
  /** Shape of every avatar in the group. @default 'circle' */
  shape?: AvatarShape
}

/** Set `--avatar-ring` to the surface behind the group when it isn't the page. */
export function AvatarGroup({
  className,
  size = 'md',
  shape,
  ...props
}: AvatarGroupProps) {
  return (
    <AvatarGroupContext value={{ size, shape }}>
      <div
        data-slot='avatar-group'
        role='group'
        className={cn(avatarGroupVariants({ size }), className)}
        {...props}
      />
    </AvatarGroupContext>
  )
}

AvatarGroup.displayName = 'Avatar.Group'
