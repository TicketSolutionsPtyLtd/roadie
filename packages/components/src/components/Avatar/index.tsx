// No 'use client': dot access must work from server components.
import { AvatarFallback } from './AvatarFallback'
import { AvatarGroup } from './AvatarGroup'
import { AvatarGroupCount } from './AvatarGroupCount'
import { AvatarImage } from './AvatarImage'
import { AvatarRoot } from './AvatarRoot'

const Avatar = AvatarRoot as typeof AvatarRoot & {
  Root: typeof AvatarRoot
  Image: typeof AvatarImage
  Fallback: typeof AvatarFallback
  Group: typeof AvatarGroup
  GroupCount: typeof AvatarGroupCount
}

Avatar.Root = AvatarRoot
Avatar.Image = AvatarImage
Avatar.Fallback = AvatarFallback
Avatar.Group = AvatarGroup
Avatar.GroupCount = AvatarGroupCount

export { Avatar }
export type { AvatarRootProps as AvatarProps } from './AvatarRoot'
export type { AvatarImageProps } from './AvatarImage'
export type { AvatarFallbackProps } from './AvatarFallback'
export type { AvatarGroupProps } from './AvatarGroup'
export type { AvatarGroupCountProps } from './AvatarGroupCount'
export { getInitials } from './getInitials'
export {
  avatarVariants,
  avatarGroupVariants,
  type AvatarShape,
  type AvatarSize
} from './variants'
