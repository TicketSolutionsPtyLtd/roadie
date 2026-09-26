'use client'

import {
  type ComponentProps,
  type ReactElement,
  type Ref,
  type RefAttributes,
  cloneElement,
  use
} from 'react'

import { mergeProps } from '@base-ui/react/merge-props'
import { OTPField as OTPFieldPrimitive } from '@base-ui/react/otp-field'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { OTPFieldContext } from './OTPFieldContext'
import {
  type OTPFieldEmphasis,
  type OTPFieldSize,
  otpFieldInputVariants
} from './variants'

export type OTPFieldInputProps = Omit<OTPFieldPrimitive.Input.Props, 'size'> &
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

type InputRender = OTPFieldPrimitive.Input.Props['render']
type InputElementProps = ComponentProps<'input'> & {
  ref?: Ref<HTMLInputElement>
}

// Mirrors Base UI's element merge: the element's own props win, refs combine.
function renderSlot(
  render: InputRender,
  props: InputElementProps,
  state: OTPFieldPrimitive.Input.State
) {
  if (typeof render === 'function') return render(props, state)
  if (!render) return <input {...props} />
  const element = render as ReactElement<InputElementProps>
  const ownRef = element.props.ref
  return cloneElement(element, {
    ...mergeProps<'input'>(props, element.props),
    ref:
      ownRef && props.ref ? mergeRefs(props.ref, ownRef) : (ownRef ?? props.ref)
  })
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
      render={(inputProps, state) =>
        renderSlot(
          render,
          { ...inputProps, ...slotLabel(inputProps, state, context.label) },
          state
        )
      }
      {...props}
    />
  )
}

OTPFieldInput.displayName = 'OTPField.Input'
