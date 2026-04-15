'use client'

import { Textarea, type TextareaProps } from '../Textarea'
import { useFieldInputProps } from './FieldContext'

export type FieldTextareaProps = TextareaProps

export function FieldTextarea(props: FieldTextareaProps) {
  const fieldProps = useFieldInputProps()
  return <Textarea data-slot='field-textarea' {...fieldProps} {...props} />
}

FieldTextarea.displayName = 'Field.Textarea'
