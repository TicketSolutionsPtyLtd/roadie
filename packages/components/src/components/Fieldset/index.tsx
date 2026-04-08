'use client'

import { type ComponentProps, createContext, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

/* ─── Context ─── */

interface FieldsetContextValue {
  invalid?: boolean
}

const FieldsetContext = createContext<FieldsetContextValue>({})

/* ─── Root ─── */

export interface FieldsetRootProps extends ComponentProps<'fieldset'> {
  invalid?: boolean
}

function FieldsetRoot({ className, invalid, ...props }: FieldsetRootProps) {
  return (
    <FieldsetContext value={{ invalid }}>
      <fieldset
        className={cn('m-0 border-none p-0 [&>*+*]:mt-6', className)}
        {...props}
      />
    </FieldsetContext>
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

export const Fieldset = Object.assign(FieldsetRoot, {
  Legend: FieldsetLegend,
  HelperText: FieldsetHelperText,
  ErrorText: FieldsetErrorText
})

export type FieldsetProps = FieldsetRootProps
