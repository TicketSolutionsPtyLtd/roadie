'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldsetContext } from './FieldsetContext'

export type FieldsetRootProps = ComponentProps<'fieldset'> & {
  invalid?: boolean
}

export function FieldsetRoot({
  className,
  invalid,
  ...props
}: FieldsetRootProps) {
  return (
    <FieldsetContext value={{ invalid }}>
      <fieldset
        className={cn('m-0 border-none p-0 [&>*+*]:mt-6', className)}
        {...props}
      />
    </FieldsetContext>
  )
}

FieldsetRoot.displayName = 'Fieldset.Root'
