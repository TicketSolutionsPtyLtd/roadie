'use client'

import { Button, type ButtonProps } from './Button'

export type IconButtonProps = Omit<ButtonProps, 'aria-label'> & {
  'aria-label': string
}

export function IconButton({ size = 'icon-md', ...props }: IconButtonProps) {
  return <Button size={size} {...props} />
}

IconButton.displayName = 'IconButton'
