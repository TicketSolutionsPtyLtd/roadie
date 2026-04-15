'use client'

import type { RefAttributes } from 'react'

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

export const buttonVariants = cva('btn is-interactive', {
  variants: {
    intent: intentVariants,
    emphasis: {
      strong: 'emphasis-strong',
      normal: 'emphasis-normal',
      subtle: 'emphasis-subtle',
      subtler: 'emphasis-subtler'
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

export type ButtonProps = ButtonPrimitive.Props &
  RefAttributes<HTMLElement> &
  VariantProps<typeof buttonVariants>

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
      data-slot='button'
      className={cn(buttonVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Button.displayName = 'Button'
