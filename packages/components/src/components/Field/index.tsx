'use client'

import { type ComponentProps, createContext, use, useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { OptionalIndicator } from '../Indicator'
import { RequiredIndicator } from '../Indicator'
import { Input, type InputProps } from '../Input'
import { Label, type LabelProps } from '../Label'
import { Textarea, type TextareaProps } from '../Textarea'

/* ─── Context ─── */

interface FieldContextValue {
  invalid?: boolean
  required?: boolean
  disabled?: boolean
  fieldId: string
  labelId: string
  helperTextId: string
  errorTextId: string
}

const FieldContext = createContext<FieldContextValue>({
  fieldId: '',
  labelId: '',
  helperTextId: '',
  errorTextId: ''
})

export function useFieldContext() {
  return use(FieldContext)
}

/* ─── Root ─── */

export interface FieldProps extends ComponentProps<'div'> {
  invalid?: boolean
  required?: boolean
  disabled?: boolean
}

export function Field({
  className,
  invalid,
  required,
  disabled,
  ...props
}: FieldProps) {
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

Field.displayName = 'Field'

/* ─── Label ─── */

export type FieldLabelProps = LabelProps & {
  showIndicator?: boolean
}

export function FieldLabel({
  htmlFor,
  showIndicator,
  children,
  ...props
}: FieldLabelProps) {
  const { fieldId, labelId, required } = use(FieldContext)
  return (
    <Label
      id={labelId || undefined}
      htmlFor={htmlFor ?? (fieldId || undefined)}
      data-slot='field-label'
      {...props}
    >
      {children}
      {showIndicator &&
        (required ? (
          <>
            {' '}
            <RequiredIndicator />
          </>
        ) : (
          <>
            {' '}
            <OptionalIndicator />
          </>
        ))}
    </Label>
  )
}

FieldLabel.displayName = 'Field.Label'

/* ─── aria helper ─── */

export function useFieldInputProps() {
  const { invalid, required, disabled, fieldId, helperTextId, errorTextId } =
    use(FieldContext)
  const describedBy = invalid ? errorTextId : helperTextId
  return {
    id: fieldId || undefined,
    disabled: disabled || undefined,
    'aria-invalid': invalid || undefined,
    'aria-required': required || undefined,
    'aria-describedby': describedBy || undefined
  }
}

/* ─── Input ─── */

export function FieldInput(props: InputProps) {
  const fieldProps = useFieldInputProps()
  return <Input data-slot='field-input' {...fieldProps} {...props} />
}

FieldInput.displayName = 'Field.Input'

/* ─── Textarea ─── */

export function FieldTextarea(props: TextareaProps) {
  const fieldProps = useFieldInputProps()
  return <Textarea data-slot='field-textarea' {...fieldProps} {...props} />
}

FieldTextarea.displayName = 'Field.Textarea'

/* ─── Helper text ─── */

export type FieldHelperTextProps = ComponentProps<'p'>

export function FieldHelperText({
  id,
  className,
  ...props
}: FieldHelperTextProps) {
  const { helperTextId } = use(FieldContext)
  return (
    <p
      id={id ?? (helperTextId || undefined)}
      data-slot='field-helper-text'
      className={cn('text-sm text-subtle', className)}
      {...props}
    />
  )
}

FieldHelperText.displayName = 'Field.HelperText'

/* ─── Error text ─── */

export type FieldErrorTextProps = ComponentProps<'p'>

export function FieldErrorText({
  id,
  className,
  ...props
}: FieldErrorTextProps) {
  const { invalid, errorTextId } = use(FieldContext)
  if (!invalid) return null
  return (
    <p
      id={id ?? (errorTextId || undefined)}
      role='alert'
      data-slot='field-error-text'
      className={cn('text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

FieldErrorText.displayName = 'Field.ErrorText'

/* ─── Compound export ─── */

Field.Label = FieldLabel
Field.Input = FieldInput
Field.Textarea = FieldTextarea
Field.HelperText = FieldHelperText
Field.ErrorText = FieldErrorText
