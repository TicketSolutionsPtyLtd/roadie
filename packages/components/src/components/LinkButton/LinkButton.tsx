import type { ComponentProps, ElementType } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { buttonVariants } from '../Button/Button'

export type LinkButtonIntent =
  | 'neutral'
  | 'brand'
  | 'brand-secondary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'

export type LinkButtonEmphasis = 'strong' | 'normal' | 'subtle' | 'subtler'

export type LinkButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export type LinkButtonProps<T extends ElementType = 'a'> = {
  as?: T
  /**
   * @default 'neutral'
   */
  intent?: LinkButtonIntent
  /**
   * @default 'normal'
   */
  emphasis?: LinkButtonEmphasis
  /**
   * @default 'md'
   */
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
      data-slot='link-button'
      className={cn(buttonVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

LinkButton.displayName = 'LinkButton'
