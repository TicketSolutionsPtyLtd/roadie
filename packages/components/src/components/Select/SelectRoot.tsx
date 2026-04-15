'use client'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { useFieldContext } from '../Field'
import { SelectContext } from './SelectContext'

export type SelectRootProps = SelectPrimitive.Root.Props<unknown> & {
  invalid?: boolean
  required?: boolean
}

export function SelectRoot({ invalid, required, ...props }: SelectRootProps) {
  const fieldContext = useFieldContext()
  const resolvedInvalid = invalid ?? fieldContext.invalid
  const resolvedRequired = required ?? fieldContext.required

  return (
    <SelectContext
      value={{ invalid: resolvedInvalid, required: resolvedRequired }}
    >
      <SelectPrimitive.Root {...props} />
    </SelectContext>
  )
}

SelectRoot.displayName = 'Select.Root'
