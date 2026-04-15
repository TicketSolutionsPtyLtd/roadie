'use client'

import { type ComponentProps, useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldContext } from './FieldContext'

export type FieldRootProps = ComponentProps<'div'> & {
  invalid?: boolean
  required?: boolean
  disabled?: boolean
}

export function FieldRoot({
  className,
  invalid,
  required,
  disabled,
  ...props
}: FieldRootProps) {
  const id = useId()
  const fieldId = `field-${id}`
  const labelId = `${fieldId}-label`
  const helperTextId = `${fieldId}-helper`
  const errorTextId = `${fieldId}-error`

  return (
    <FieldContext
      value={{
        invalid,
        required,
        disabled,
        fieldId,
        labelId,
        helperTextId,
        errorTextId
      }}
    >
      <div
        data-slot='field'
        className={cn('grid gap-1.5', className)}
        {...props}
      />
    </FieldContext>
  )
}

FieldRoot.displayName = 'Field.Root'
