import type { ComponentProps, ElementType } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { buttonVariants } from '../Button/Button'
import type { LinkButtonEmphasis, LinkButtonIntent } from './LinkButton'

export type LinkIconButtonSize = 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg'

export type LinkIconButtonProps<T extends ElementType = 'a'> = {
  as?: T
  'aria-label': string
  /**
   * @default 'neutral'
   */
  intent?: LinkButtonIntent
  /**
   * @default 'normal'
   */
  emphasis?: LinkButtonEmphasis
  /**
   * @default 'icon-md'
   */
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
      data-slot='link-icon-button'
      className={cn(buttonVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

LinkIconButton.displayName = 'LinkIconButton'
