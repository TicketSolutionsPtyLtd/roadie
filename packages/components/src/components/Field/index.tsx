'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Input, type InputProps } from '../Input'
import { Textarea, type TextareaProps } from '../Textarea'

/* ─── Root ─── */

export interface FieldRootProps extends ComponentProps<'div'> {}

function FieldRoot({ className, ...props }: FieldRootProps) {
  return <div className={cn('grid gap-1.5', className)} {...props} />
}

FieldRoot.displayName = 'Field'

/* ─── Label ─── */

export interface FieldLabelProps extends ComponentProps<'label'> {}

function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <label
      className={cn('text-sm font-medium text-default', className)}
      {...props}
    />
  )
}

FieldLabel.displayName = 'Field.Label'

/* ─── Input ─── */

function FieldInput(props: InputProps) {
  return <Input {...props} />
}

FieldInput.displayName = 'Field.Input'

/* ─── Textarea ─── */

function FieldTextarea(props: TextareaProps) {
  return <Textarea {...props} />
}

FieldTextarea.displayName = 'Field.Textarea'

/* ─── Helper text ─── */

export interface FieldHelperTextProps extends ComponentProps<'p'> {}

function FieldHelperText({ className, ...props }: FieldHelperTextProps) {
  return <p className={cn('text-sm text-subtle', className)} {...props} />
}

FieldHelperText.displayName = 'Field.HelperText'

/* ─── Error text ─── */

export interface FieldErrorTextProps extends ComponentProps<'p'> {}

function FieldErrorText({ className, ...props }: FieldErrorTextProps) {
  return (
    <p
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
