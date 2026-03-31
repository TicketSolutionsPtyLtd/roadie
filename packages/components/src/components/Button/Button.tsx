'use client'

import type { ComponentProps } from 'react'

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full font-bold border border-transparent transition-all select-none is-interactive gap-1.5 [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
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
        strong: 'emphasis-strong',
        default:
          'emphasis-default-surface emphasis-default-fg emphasis-subtle-border hover:emphasis-subtle-surface',
        subtle: 'emphasis-subtle hover:brightness-95',
        subtler: 'emphasis-default-fg hover:emphasis-subtler-surface'
      },
      size: {
        xs: 'h-6 min-w-6 text-xs px-2.5 py-0.5 [&_svg:not([class*="size-"])]:size-3',
        sm: 'h-8 min-w-8 text-sm px-3 py-1',
        md: 'h-10 min-w-10 text-sm px-4 py-2',
        lg: 'h-12 min-w-12 text-base px-6 py-2',
        'icon-xs': 'size-6 p-0 [&_svg:not([class*="size-"])]:size-3',
        'icon-sm': 'size-8 p-0',
        'icon-md': 'size-10 p-0',
        'icon-lg': 'size-12 p-0'
      }
    },
    defaultVariants: {
      intent: 'brand',
      emphasis: 'default',
      size: 'md'
    }
  }
)

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
      className={cn(buttonVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Button.displayName = 'Button'
