'use client'

import { type ComponentProps, createContext, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

/* ─── Context ─── */

interface FieldsetContextValue {
  invalid?: boolean
}

const FieldsetContext = createContext<FieldsetContextValue>({})

/* ─── Root ─── */

export interface FieldsetProps extends ComponentProps<'fieldset'> {
  invalid?: boolean
}

export function Fieldset({ className, invalid, ...props }: FieldsetProps) {
  return (
    <FieldsetContext value={{ invalid }}>
      <fieldset
        className={cn('m-0 border-none p-0 [&>*+*]:mt-6', className)}
        {...props}
      />
    </FieldsetContext>
  )
}

Fieldset.displayName = 'Fieldset'

/* ─── Legend ─── */

export type FieldsetLegendProps = ComponentProps<'legend'>

export function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return (
    <legend
      className={cn('text-lg font-semibold text-strong', className)}
      {...props}
    />
  )
}

FieldsetLegend.displayName = 'Fieldset.Legend'

/* ─── Helper text ─── */

export type FieldsetHelperTextProps = ComponentProps<'p'>

export function FieldsetHelperText({
  className,
  ...props
}: FieldsetHelperTextProps) {
  return <p className={cn('text-sm text-subtle', className)} {...props} />
}

FieldsetHelperText.displayName = 'Fieldset.HelperText'

/* ─── Error text ─── */

export type FieldsetErrorTextProps = ComponentProps<'p'>

export function FieldsetErrorText({
  className,
  ...props
}: FieldsetErrorTextProps) {
  const { invalid } = use(FieldsetContext)
  if (!invalid) return null
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

Fieldset.Legend = FieldsetLegend
Fieldset.HelperText = FieldsetHelperText
Fieldset.ErrorText = FieldsetErrorText
