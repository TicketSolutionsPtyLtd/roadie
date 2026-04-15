import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

export const textareaVariants = cva(
  'w-full rounded-lg font-sans min-h-20 resize-y',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        normal: 'emphasis-sunken border border-subtle is-interactive-field',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field'
      },
      size: {
        sm: 'px-1.5 py-2 text-base',
        md: 'px-2 py-2.5 text-base',
        lg: 'px-2 py-3 text-base'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)

export interface TextareaProps
  extends Omit<ComponentProps<'textarea'>, 'size'>,
    VariantProps<typeof textareaVariants> {
  autoResize?: boolean
}

export function Textarea({
  className,
  intent,
  emphasis,
  size,
  autoResize,
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        textareaVariants({ intent, emphasis, size }),
        autoResize && '[field-sizing:content] resize-none',
        className
      )}
      {...props}
    />
  )
}

Textarea.displayName = 'Textarea'
