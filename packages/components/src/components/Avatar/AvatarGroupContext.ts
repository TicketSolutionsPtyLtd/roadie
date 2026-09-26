'use client'

import { createContext } from 'react'

import type { AvatarShape, AvatarSize } from './variants'

export type AvatarGroupContextValue = {
  size?: AvatarSize
  shape?: AvatarShape
}

export const AvatarGroupContext = createContext<AvatarGroupContextValue>({})
