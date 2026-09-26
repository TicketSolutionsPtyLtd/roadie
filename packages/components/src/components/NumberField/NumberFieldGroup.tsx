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
    emphasis?: 'normal' | 'subtle' | 'subtler'
  }

export function NumberFieldGroup({
  className,
  size,
  emphasis,
  ...props
}: NumberFieldGroupProps) {
  const rootContext = use(NumberFieldContext)
  const context = {
    ...rootContext,
    size: size ?? rootContext.size,
    emphasis: emphasis ?? rootContext.emphasis
  }

  return (
    <NumberFieldContext value={context}>
      <NumberFieldPrimitive.Group
        data-slot='number-field-group'
        className={cn(
          numberFieldGroupVariants({
            size: context.size,
            emphasis: context.emphasis
          }),
          className
        )}
        data-emphasis={context.emphasis ?? 'normal'}
        data-editable={context.editable === false ? 'false' : undefined}
        aria-invalid={context.invalid || undefined}
        {...props}
      />
    </NumberFieldContext>
  )
}

NumberFieldGroup.displayName = 'NumberField.Group'
