import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const separatorVariants = cva('emphasis-subtle-border', {
  variants: {
    orientation: {
      horizontal: 'h-px w-full border-t',
      vertical: 'w-px self-stretch border-l'
    }
  },
  defaultVariants: {
    orientation: 'horizontal'
  }
})

export interface SeparatorProps
  extends ComponentProps<'div'>,
    VariantProps<typeof separatorVariants> {}

export function Separator({
  className,
  orientation,
  ...props
}: SeparatorProps) {
  return (
    <div
      role='separator'
      aria-orientation={orientation ?? 'horizontal'}
      className={cn(separatorVariants({ orientation, className }))}
      {...props}
    />
  )
}

Separator.displayName = 'Separator'
