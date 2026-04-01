import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const headingVariants = cva('text-display-ui', {
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
      default: 'text-strong',
      strong: 'text-strong',
      subtle: 'text-subtle',
      subtler: 'text-subtler',
      inverted: 'text-inverted'
    }
  },
  defaultVariants: {
    emphasis: 'default'
  }
})

type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export interface HeadingProps
  extends ComponentProps<'h2'>,
    VariantProps<typeof headingVariants> {
  as?: HeadingElement
}

export function Heading({
  as: Component = 'h2',
  className,
  intent,
  emphasis,
  ...props
}: HeadingProps) {
  return (
    <Component
      className={cn(headingVariants({ intent, emphasis, className }))}
      {...props}
    />
  )
}

Heading.displayName = 'Heading'
