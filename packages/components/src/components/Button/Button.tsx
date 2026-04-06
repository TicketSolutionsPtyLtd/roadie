'use client'

import type { ComponentProps } from 'react'

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const buttonVariants = cva('btn is-interactive', {
  variants: {
    intent: {
      neutral: 'intent-neutral',
      brand: 'intent-brand',
      'brand-secondary': 'intent-brand-secondary',
      accent: 'intent-accent',
      danger: 'intent-danger',
      success: 'intent-success',
      warning: 'intent-warning',
      info: 'intent-info'
    },
    emphasis: {
      strong: 'emphasis-strong',
      normal: 'emphasis-normal text-subtle',
      subtle: 'emphasis-subtle text-subtle',
      subtler: 'emphasis-subtler text-subtle'
    },
    size: {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
      'icon-xs': 'btn-icon-xs',
      'icon-sm': 'btn-icon-sm',
      'icon-md': 'btn-icon-md',
      'icon-lg': 'btn-icon-lg'
    }
  },
  defaultVariants: {
    emphasis: 'normal',
    size: 'md'
  }
})

export interface ButtonProps
  extends ComponentProps<typeof ButtonPrimitive>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  intent,
  emphasis,
  size,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      nativeButton={!props.render}
      className={cn(buttonVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Button.displayName = 'Button'
