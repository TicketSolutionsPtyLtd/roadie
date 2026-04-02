import type { ComponentProps, ElementType } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const cardVariants = cva('rounded-lg', {
  variants: {
    intent: {
      neutral: 'intent-neutral',
      brand: 'intent-brand',
      accent: 'intent-accent',
      danger: 'intent-danger',
      success: 'intent-success',
      warning: 'intent-warning',
      info: 'intent-info'
    },
    emphasis: {
      raised: 'emphasis-raised',
      subtle: 'bg-subtle border border-subtle',
      default: 'bg-default border border-subtle'
    }
  },
  defaultVariants: {
    emphasis: 'default'
  }
})

export interface CardProps
  extends ComponentProps<'div'>,
    VariantProps<typeof cardVariants> {
  as?: ElementType
}

function CardRoot({
  as: Component = 'div',
  className,
  intent,
  emphasis,
  ...props
}: CardProps) {
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
})

export type { CardProps as CardHeaderProps }
