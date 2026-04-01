'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

/* ─── Root ─── */

export interface FieldsetRootProps extends ComponentProps<'fieldset'> {}

function FieldsetRoot({ className, ...props }: FieldsetRootProps) {
  return (
    <fieldset className={cn('border-none p-0 m-0', className)} {...props} />
  )
}

FieldsetRoot.displayName = 'Fieldset'

/* ─── Legend ─── */

export interface FieldsetLegendProps extends ComponentProps<'legend'> {}

function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return (
    <legend
      className={cn('text-lg font-semibold emphasis-strong-fg', className)}
      {...props}
    />
  )
}

FieldsetLegend.displayName = 'Fieldset.Legend'

/* ─── Helper text ─── */

export interface FieldsetHelperTextProps extends ComponentProps<'p'> {}

function FieldsetHelperText({ className, ...props }: FieldsetHelperTextProps) {
  return (
    <p className={cn('text-sm emphasis-subtle-fg', className)} {...props} />
  )
}

FieldsetHelperText.displayName = 'Fieldset.HelperText'

/* ─── Error text ─── */

export interface FieldsetErrorTextProps extends ComponentProps<'p'> {}

function FieldsetErrorText({ className, ...props }: FieldsetErrorTextProps) {
  return (
    <p
      className={cn('text-sm intent-danger emphasis-subtle-fg', className)}
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
