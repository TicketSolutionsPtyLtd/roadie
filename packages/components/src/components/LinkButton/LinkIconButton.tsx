import type { ComponentProps, ElementType } from 'react'

import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { buttonVariants } from '../Button/Button'

type LinkIconButtonSize = 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg'

export type LinkIconButtonProps<T extends ElementType = 'a'> = {
  as?: T
  'aria-label': string
  intent?: VariantProps<typeof buttonVariants>['intent']
  emphasis?: VariantProps<typeof buttonVariants>['emphasis']
  size?: LinkIconButtonSize
  className?: string
} & Omit<
  ComponentProps<T>,
  'as' | 'aria-label' | 'intent' | 'emphasis' | 'size' | 'className'
>

export function LinkIconButton<T extends ElementType = 'a'>({
  as,
  className,
  intent,
  emphasis,
  size = 'icon-md',
  ...props
}: LinkIconButtonProps<T>) {
  const Component = as || 'a'
  return (
    <Component
      className={cn(buttonVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

LinkIconButton.displayName = 'LinkIconButton'
