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

export interface FieldRootProps extends ComponentProps<'div'> {
  invalid?: boolean
  required?: boolean
  disabled?: boolean
}

function FieldRoot({
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
      <div className={cn('grid gap-1.5', className)} {...props} />
    </FieldContext>
  )
}

FieldRoot.displayName = 'Field'

/* ─── Label ─── */

export interface FieldLabelProps extends LabelProps {
  showIndicator?: boolean
}

function FieldLabel({
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

function FieldInput(props: InputProps) {
  const fieldProps = useFieldInputProps()
  return <Input {...fieldProps} {...props} />
}

FieldInput.displayName = 'Field.Input'

/* ─── Textarea ─── */

function FieldTextarea(props: TextareaProps) {
  const fieldProps = useFieldInputProps()
  return <Textarea {...fieldProps} {...props} />
}

FieldTextarea.displayName = 'Field.Textarea'

/* ─── Helper text ─── */

export interface FieldHelperTextProps extends ComponentProps<'p'> {}

function FieldHelperText({ id, className, ...props }: FieldHelperTextProps) {
  const { helperTextId } = use(FieldContext)
  return (
    <p
      id={id ?? (helperTextId || undefined)}
      className={cn('text-sm text-subtle', className)}
      {...props}
    />
  )
}

FieldHelperText.displayName = 'Field.HelperText'

/* ─── Error text ─── */

export interface FieldErrorTextProps extends ComponentProps<'p'> {}

function FieldErrorText({ id, className, ...props }: FieldErrorTextProps) {
  const { invalid, errorTextId } = use(FieldContext)
  if (!invalid) return null
  return (
    <p
      id={id ?? (errorTextId || undefined)}
      role='alert'
      className={cn('text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

FieldErrorText.displayName = 'Field.ErrorText'

/* ─── Compound export ─── */

export const Field = Object.assign(FieldRoot, {
  Label: FieldLabel,
  Input: FieldInput,
  Textarea: FieldTextarea,
  HelperText: FieldHelperText,
  ErrorText: FieldErrorText
})

export type FieldProps = FieldRootProps
