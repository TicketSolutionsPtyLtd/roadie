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
      subtle: 'emphasis-subtle-surface emphasis-subtle-border',
      default: 'emphasis-default-surface emphasis-subtle-border'
    }
  },
  defaultVariants: {
    emphasis: 'raised'
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
  return <div className={cn('px-6 pt-6 flex flex-col gap-1.5', className)} {...props} />
}

CardHeader.displayName = 'Card.Header'

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

CardContent.displayName = 'Card.Content'

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('px-6 pb-6 flex items-center gap-2', className)} {...props} />
  )
}

CardFooter.displayName = 'Card.Footer'

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter
})

export type { CardProps as CardHeaderProps }
