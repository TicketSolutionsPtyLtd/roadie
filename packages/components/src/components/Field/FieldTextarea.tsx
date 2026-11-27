'use client'

import { Textarea, type TextareaProps } from '../Textarea'
import { useFieldContext, useFieldControlProps } from './FieldContext'

export type FieldTextareaProps = TextareaProps

export function FieldTextarea({
  'aria-describedby': describedBy,
  ...props
}: FieldTextareaProps) {
  const { disabled } = useFieldContext()
  const fieldProps = useFieldControlProps({ 'aria-describedby': describedBy })
  return (
    <Textarea
      data-slot='field-textarea'
      {...fieldProps}
      disabled={disabled || undefined}
      {...props}
    />
  )
}

FieldTextarea.displayName = 'Field.Textarea'
