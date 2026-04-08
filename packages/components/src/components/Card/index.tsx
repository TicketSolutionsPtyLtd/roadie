import type { ComponentProps, ElementType, ImgHTMLAttributes } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

export const cardVariants = cva('grid content-start rounded-xl group/card', {
  variants: {
    intent: intentVariants,
    emphasis: {
      raised: 'emphasis-raised',
      subtle: 'emphasis-subtle',
      subtler: 'emphasis-subtler p-2 gap-4 -m-2',
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
  const rest = props as Record<string, unknown>
  const isInteractive = !!rest.href || !!rest.onClick
  const Component = as || (rest.href ? 'a' : 'div')
  return (
    <Component
      className={cn(
        cardVariants({ intent, emphasis }),
        isInteractive && 'is-interactive',
        className
      )}
      {...props}
    />
  )
}

CardRoot.displayName = 'Card'

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'grid gap-1.5 px-6 pt-6 group-[.emphasis-subtler]/card:px-0 group-[.emphasis-subtler]/card:pt-0',
        className
      )}
      {...props}
    />
  )
}

CardHeader.displayName = 'Card.Header'

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'px-6 py-4 group-[.emphasis-subtler]/card:px-0 group-[.emphasis-subtler]/card:py-0',
        className
      )}
      {...props}
    />
  )
}

CardContent.displayName = 'Card.Content'

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-6 pb-6 group-[.emphasis-subtler]/card:px-0 group-[.emphasis-subtler]/card:pb-0',
        className
      )}
      {...props}
    />
  )
}

CardFooter.displayName = 'Card.Footer'

function CardImage({
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <div className='overflow-hidden rounded-xl'>
      <img
        className={cn(
          'aspect-2/1 w-full object-cover transition-transform duration-300 group-hover/card:scale-105',
          className
        )}
        {...props}
      />
    </div>
  )
}

CardImage.displayName = 'Card.Image'

function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3 className={cn('text-display-ui-6 text-strong', className)} {...props} />
  )
}

CardTitle.displayName = 'Card.Title'

function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-subtle', className)} {...props} />
}

CardDescription.displayName = 'Card.Description'

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
  Image: CardImage,
  Title: CardTitle,
  Description: CardDescription
}) as typeof CardRoot & {
  Header: typeof CardHeader
  Content: typeof CardContent
  Footer: typeof CardFooter
  Image: typeof CardImage
  Title: typeof CardTitle
  Description: typeof CardDescription
}
