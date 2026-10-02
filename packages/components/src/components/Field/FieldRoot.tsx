'use client'

import { type ComponentProps, useCallback, useId, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldContext, FieldControlErrorContext } from './FieldContext'

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
  // Keyed by control, so one control clearing its error leaves another's.
  const [controlErrors, setControlErrors] = useState<Record<string, string>>({})
  const setControlError = useCallback(
    (control: string, message: string | null) =>
      setControlErrors(({ [control]: _, ...others }) =>
        message === null ? others : { ...others, [control]: message }
      ),
    []
  )
  const controlError = Object.values(controlErrors)[0] ?? null

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
      <FieldControlErrorContext value={{ controlError, setControlError }}>
        <div
          data-slot='field'
          className={cn('grid gap-1.5', className)}
          {...props}
        />
      </FieldControlErrorContext>
    </FieldContext>
  )
}

FieldRoot.displayName = 'Field.Root'
