'use client'

import { Fragment, type RefAttributes } from 'react'

import { OTPField as OTPFieldPrimitive } from '@base-ui/react/otp-field'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { OTPFieldContext } from './OTPFieldContext'
import { OTPFieldInput } from './OTPFieldInput'
import { OTPFieldSeparator } from './OTPFieldSeparator'
import type { OTPFieldEmphasis, OTPFieldSize } from './variants'

export type OTPFieldRootProps = OTPFieldPrimitive.Root.Props &
  RefAttributes<HTMLDivElement> & {
    /** Slot size, matching `Input` heights: 32, 40 or 48px square. Use `lg` for touch. */
    size?: OTPFieldSize
    /** Slot surface. `subtle` swaps the border for a tinted fill. */
    emphasis?: OTPFieldEmphasis
    /** Marks the code as invalid. Inherits from `Field` when omitted. */
    invalid?: boolean
    /**
     * Slots per group when the root renders its own slots. A separator sits
     * between groups, so `length={6} groupSize={3}` reads as 3-3.
     */
    groupSize?: number
  }

function renderSlots(length: number, groupSize?: number) {
  return Array.from({ length }, (_, index) => {
    const position = index + 1
    const endsGroup =
      !!groupSize && position % groupSize === 0 && position < length
    return (
      <Fragment key={index}>
        <OTPFieldInput />
        {endsGroup && <OTPFieldSeparator />}
      </Fragment>
    )
  })
}

export function OTPFieldRoot({
  className,
  children,
  length,
  size,
  emphasis,
  invalid,
  groupSize,
  id,
  required,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: OTPFieldRootProps) {
  const field = useFieldContext()
  const resolvedInvalid = invalid ?? field.invalid
  const describedBy = resolvedInvalid ? field.errorTextId : field.helperTextId

  return (
    <OTPFieldContext
      value={{ size, emphasis, invalid: resolvedInvalid, label: ariaLabel }}
    >
      <OTPFieldPrimitive.Root
        data-slot='otp-field'
        className={cn('flex items-center gap-2', className)}
        length={length}
        id={id ?? (field.fieldId || undefined)}
        required={required ?? field.required}
        disabled={disabled ?? field.disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy || undefined}
        {...props}
      >
        {children ?? renderSlots(length, groupSize)}
      </OTPFieldPrimitive.Root>
    </OTPFieldContext>
  )
}

OTPFieldRoot.displayName = 'OTPField.Root'
