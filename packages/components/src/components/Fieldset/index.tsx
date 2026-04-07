'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

/* ─── Root ─── */

export interface FieldsetRootProps extends ComponentProps<'fieldset'> {}

function FieldsetRoot({ className, ...props }: FieldsetRootProps) {
  return (
    <fieldset
      className={cn('m-0 border-none p-0 [&>*+*]:mt-6', className)}
      {...props}
    />
  )
}

FieldsetRoot.displayName = 'Fieldset'

/* ─── Legend ─── */

export interface FieldsetLegendProps extends ComponentProps<'legend'> {}

function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return (
    <legend
      className={cn('text-lg font-semibold text-strong', className)}
      {...props}
    />
  )
}

FieldsetLegend.displayName = 'Fieldset.Legend'

/* ─── Helper text ─── */

export interface FieldsetHelperTextProps extends ComponentProps<'p'> {}

function FieldsetHelperText({ className, ...props }: FieldsetHelperTextProps) {
  return <p className={cn('text-sm text-subtle', className)} {...props} />
}

FieldsetHelperText.displayName = 'Fieldset.HelperText'

/* ─── Error text ─── */

export interface FieldsetErrorTextProps extends ComponentProps<'p'> {}

function FieldsetErrorText({ className, ...props }: FieldsetErrorTextProps) {
  return (
    <p
      role='alert'
      className={cn('text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

FieldsetErrorText.displayName = 'Fieldset.ErrorText'

/* ─── Compound export ─── */

export const Fieldset = Object.assign(FieldsetRoot, {
  Legend: FieldsetLegend,
  HelperText: FieldsetHelperText,
  ErrorText: FieldsetErrorText
})

export type FieldsetProps = FieldsetRootProps
