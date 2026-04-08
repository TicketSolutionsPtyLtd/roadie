import type { ComponentProps, ElementType } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

export const cardVariants = cva('rounded-xl', {
  variants: {
    intent: intentVariants,
    emphasis: {
      raised: 'emphasis-raised',
      subtle: 'emphasis-subtle',
      normal: 'emphasis-normal'
    }
  },
  defaultVariants: {
    emphasis: 'normal'
  }
})

type CardOwnProps<T extends ElementType = 'div'> = {
  as?: T
} & VariantProps<typeof cardVariants>

export type CardProps<T extends ElementType = 'div'> = CardOwnProps<T> &
  Omit<ComponentProps<T>, keyof CardOwnProps<T>>

function CardRoot<T extends ElementType = 'div'>({
  as,
  className,
  intent,
  emphasis,
  ...props
}: CardProps<T>) {
  const Component = as || 'div'
  return (
    <Component
      className={cn(cardVariants({ intent, emphasis, className }))}
      {...props}
    />
  )
}

CardRoot.displayName = 'Card'

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-1.5 px-6 pt-6', className)} {...props} />
}

CardHeader.displayName = 'Card.Header'

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

CardContent.displayName = 'Card.Content'

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center gap-2 px-6 pb-6', className)}
      {...props}
    />
  )
}

CardFooter.displayName = 'Card.Footer'

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter
}) as typeof CardRoot & {
  Header: typeof CardHeader
  Content: typeof CardContent
  Footer: typeof CardFooter
}
