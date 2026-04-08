import type { ComponentProps, ElementType } from 'react'

import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { buttonVariants } from '../Button/Button'

type LinkButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export type LinkButtonProps<T extends ElementType = 'a'> = {
  as?: T
  intent?: VariantProps<typeof buttonVariants>['intent']
  emphasis?: VariantProps<typeof buttonVariants>['emphasis']
  size?: LinkButtonSize
  className?: string
} & Omit<ComponentProps<T>, 'as' | 'intent' | 'emphasis' | 'size' | 'className'>

export function LinkButton<T extends ElementType = 'a'>({
  as,
  className,
  intent,
  emphasis,
  size,
  ...props
}: LinkButtonProps<T>) {
  const Component = as || 'a'
  return (
    <Component
      className={cn(buttonVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

LinkButton.displayName = 'LinkButton'
