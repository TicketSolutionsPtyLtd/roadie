import type { ComponentProps, ElementType } from 'react'

import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { cardVariants } from './variants'

type CardOwnProps<T extends ElementType = 'div'> = {
  as?: T
} & VariantProps<typeof cardVariants>

export type CardRootProps<T extends ElementType = 'div'> = CardOwnProps<T> &
  Omit<ComponentProps<T>, keyof CardOwnProps<T>>

export function CardRoot<T extends ElementType = 'div'>({
  as,
  className,
  intent,
  emphasis,
  ...props
}: CardRootProps<T>) {
  const rest = props as Record<string, unknown>
  const isInteractive = !!rest.href || !!rest.onClick
  const Component = as || (rest.href ? 'a' : 'div')
  return (
    <Component
      data-slot='card'
      className={cn(
        cardVariants({ intent, emphasis }),
        isInteractive && 'is-interactive',
        className
      )}
      {...props}
    />
  )
}

CardRoot.displayName = 'Card.Root'
