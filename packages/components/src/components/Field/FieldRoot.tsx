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
  // Every mounted control holds a place in mount order, error or not, so the
  // first control's error shows first whichever failed first.
  const [controlErrors, setControlErrors] = useState<[string, string | null][]>(
    []
  )
  const setControlError = useCallback(
    (control: string, message: string | null | undefined) =>
      setControlErrors((errors) => {
        if (message === undefined)
          return errors.filter(([key]) => key !== control)
        if (!errors.some(([key]) => key === control))
          return [...errors, [control, message]]
        if (errors.some(([key, held]) => key === control && held === message))
          return errors
        return errors.map((error) =>
          error[0] === control ? [control, message] : error
        )
      }),
    []
  )
  const controlError =
    controlErrors.find(([, message]) => message !== null)?.[1] ?? null

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
