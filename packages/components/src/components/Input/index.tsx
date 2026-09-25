import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'

export const inputVariants = cva('w-full rounded-lg font-sans', {
  variants: {
    intent: intentVariants,
    emphasis: {
      normal: 'emphasis-field is-interactive-field',
      subtle:
        'bg-subtle text-normal border border-transparent is-interactive-field'
    },
    size: {
      sm: 'h-8 px-1.5 text-base',
      md: 'h-10 px-2 text-base',
      lg: 'h-12 px-2 text-base'
    }
  },
  defaultVariants: {
    emphasis: 'normal',
    size: 'md'
  }
})

export interface InputProps
  extends
    Omit<ComponentProps<'input'>, 'size'>,
    Omit<VariantProps<typeof inputVariants>, 'intent'> {
  /**
   * @deprecated Form controls take their colour from state;
   * `is-interactive-field` handles it. Will be removed in v3.0.0.
   */
  intent?: RoadieIntent | null
}

export function Input({
  className,
  intent,
  emphasis,
  size,
  type = 'text',
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(inputVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Input.displayName = 'Input'
