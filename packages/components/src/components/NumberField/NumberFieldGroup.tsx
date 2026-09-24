'use client'

import { type RefAttributes, use } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'

import { cn } from '@oztix/roadie-core/utils'

import { NumberFieldContext } from './NumberFieldContext'
import { numberFieldGroupVariants } from './variants'

export type NumberFieldGroupProps = NumberFieldPrimitive.Group.Props &
  RefAttributes<HTMLDivElement> & {
    /** Overrides the size set on the root. */
    size?: 'sm' | 'md' | 'lg'
    /** Overrides the emphasis set on the root. */
    emphasis?: 'normal' | 'subtle'
  }

export function NumberFieldGroup({
  className,
  size,
  emphasis,
  ...props
}: NumberFieldGroupProps) {
  const context = use(NumberFieldContext)

  return (
    <NumberFieldPrimitive.Group
      data-slot='number-field-group'
      className={cn(
        numberFieldGroupVariants({
          size: size ?? context.size,
          emphasis: emphasis ?? context.emphasis
        }),
        className
      )}
      aria-invalid={context.invalid || undefined}
      {...props}
    />
  )
}

NumberFieldGroup.displayName = 'NumberField.Group'
