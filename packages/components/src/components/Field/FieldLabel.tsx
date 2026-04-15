'use client'

import { use } from 'react'

import { OptionalIndicator, RequiredIndicator } from '../Indicator'
import { Label, type LabelProps } from '../Label'
import { FieldContext } from './FieldContext'

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
