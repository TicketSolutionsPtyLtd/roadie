'use client'

import type { ComponentProps } from 'react'

import { Button } from './Button'

export interface IconButtonProps
  extends Omit<ComponentProps<typeof Button>, 'aria-label'> {
  'aria-label': string
}

export function IconButton({ size = 'icon-md', ...props }: IconButtonProps) {
  return <Button size={size} {...props} />
}

IconButton.displayName = 'IconButton'
