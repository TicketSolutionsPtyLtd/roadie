'use client'

import { Fragment, type RefAttributes } from 'react'

import { OTPField as OTPFieldPrimitive } from '@base-ui/react/otp-field'

import { mergeClassName } from '../../utils/mergeClassName'
import { useFieldContext } from '../Field'
import { useFieldControlProps } from '../Field/FieldContext'
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
    /**
     * Focus the first slot on mount, for a code screen the reader just arrived
     * on. Base UI's root has no such prop, so it reaches that slot instead of
     * the root `div`.
     */
    autoFocus?: boolean
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
  autoFocus,
  id,
  required,
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  ...props
}: OTPFieldRootProps) {
  const field = useFieldContext()
  const resolvedInvalid = invalid ?? field.invalid
  const fieldProps = useFieldControlProps({
    id,
    invalid: resolvedInvalid,
    'aria-describedby': describedBy
  })

  return (
    <OTPFieldContext
      value={{
        size,
        emphasis,
        invalid: resolvedInvalid,
        label: ariaLabel,
        autoFocus
      }}
    >
      <OTPFieldPrimitive.Root
        data-slot='otp-field'
        className={mergeClassName('flex items-center gap-2', className)}
        length={length}
        id={fieldProps.id}
        required={required ?? field.required}
        disabled={disabled ?? field.disabled}
        aria-label={ariaLabel}
        aria-describedby={fieldProps['aria-describedby']}
        {...props}
      >
        {children ?? renderSlots(length, groupSize)}
      </OTPFieldPrimitive.Root>
    </OTPFieldContext>
  )
}

OTPFieldRoot.displayName = 'OTPField.Root'
