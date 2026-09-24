'use client'

import { type RefAttributes, use } from 'react'

import { OTPField as OTPFieldPrimitive } from '@base-ui/react/otp-field'

import { cn } from '@oztix/roadie-core/utils'

import { OTPFieldContext } from './OTPFieldContext'
import {
  type OTPFieldEmphasis,
  type OTPFieldSize,
  otpFieldInputVariants
} from './variants'

export type OTPFieldInputProps = OTPFieldPrimitive.Input.Props &
  RefAttributes<HTMLInputElement> & {
    /** Slot size. Inherits from the root when omitted. */
    size?: OTPFieldSize
    /** Slot surface. Inherits from the root when omitted. */
    emphasis?: OTPFieldEmphasis
  }

type SlotLabel = { 'aria-label'?: string; 'aria-labelledby'?: string }

// Base UI names every slot after the field label. Later slots read better as
// their position, and without Field the first slot takes the root's label.
function slotLabel(
  props: SlotLabel,
  state: OTPFieldPrimitive.Input.State,
  groupLabel?: string
): SlotLabel {
  if (props['aria-label'] != null) return {}
  if (state.index > 0) {
    return {
      'aria-label': `Character ${state.index + 1} of ${state.length}`,
      'aria-labelledby': undefined
    }
  }
  if (!props['aria-labelledby'] && groupLabel) {
    return { 'aria-label': groupLabel }
  }
  return {}
}

export function OTPFieldInput({
  className,
  size,
  emphasis,
  render,
  ...props
}: OTPFieldInputProps) {
  const context = use(OTPFieldContext)

  return (
    <OTPFieldPrimitive.Input
      data-slot='otp-field-input'
      className={(state) =>
        cn(
          otpFieldInputVariants({
            size: size ?? context.size,
            emphasis: emphasis ?? context.emphasis
          }),
          typeof className === 'function' ? className(state) : className
        )
      }
      aria-invalid={context.invalid || undefined}
      render={
        render ??
        ((inputProps, state) => (
          <input
            {...inputProps}
            {...slotLabel(inputProps, state, context.label)}
          />
        ))
      }
      {...props}
    />
  )
}

OTPFieldInput.displayName = 'OTPField.Input'
