'use client'

import { type RefAttributes, useState } from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { NumberFieldContext } from './NumberFieldContext'
import { NumberFieldDecrement } from './NumberFieldDecrement'
import { NumberFieldGroup } from './NumberFieldGroup'
import { NumberFieldIncrement } from './NumberFieldIncrement'
import { NumberFieldInput } from './NumberFieldInput'

export type NumberFieldRootProps = NumberFieldPrimitive.Root.Props &
  RefAttributes<HTMLDivElement> & {
    /** Height of the field and its stepper buttons. */
    size?: 'sm' | 'md' | 'lg'
    /**
     * Field surface. `subtle` swaps the border for a tinted fill. `subtler`
     * drops the field box for round standalone buttons either side of a bare
     * number.
     */
    emphasis?: 'normal' | 'subtle' | 'subtler'
    /** Marks the value as invalid. Inherits from `Field` when omitted. */
    invalid?: boolean
    /**
     * One step above `min`, the decrement button shows a trash icon and is
     * named Remove. It still steps down to `min`.
     */
    removable?: boolean
    /**
     * Whether people can type a value. With `false` the buttons, arrow keys,
     * Home and End still change it.
     * @default true
     */
    editable?: boolean
  }

// Changes that step the value rather than come from typing. Each one hands
// the display back to the animated number.
const STEP_REASONS = new Set<string>([
  'keyboard',
  'increment-press',
  'decrement-press',
  'wheel',
  'scrub'
])

export function NumberFieldRoot({
  className,
  children,
  size,
  emphasis,
  invalid,
  removable,
  editable = true,
  id,
  required,
  disabled,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  step,
  locale,
  format,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: NumberFieldRootProps) {
  const fieldContext = useFieldContext()
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? null
  )
  const [stepCount, setStepCount] = useState(0)
  const currentValue = value !== undefined ? value : uncontrolledValue
  // Without children the root renders the input itself, so a label meant for
  // the field has to land on the input rather than the wrapping div.
  const labelProps = {
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy
  }

  return (
    <NumberFieldContext
      value={{
        size,
        emphasis,
        invalid: invalid ?? fieldContext.invalid,
        value: currentValue,
        min,
        max,
        step: typeof step === 'number' ? step : 1,
        removable,
        editable,
        stepCount,
        locale,
        format
      }}
    >
      <NumberFieldPrimitive.Root
        data-slot='number-field'
        className={cn('grid w-fit gap-1.5', className)}
        id={id ?? (fieldContext.fieldId || undefined)}
        required={required ?? fieldContext.required}
        disabled={disabled ?? fieldContext.disabled}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(nextValue, eventDetails) => {
          setUncontrolledValue(nextValue)
          if (STEP_REASONS.has(eventDetails.reason)) {
            setStepCount((count) => count + 1)
          }
          onValueChange?.(nextValue, eventDetails)
        }}
        min={min}
        max={max}
        step={step}
        locale={locale}
        format={format}
        {...(children !== undefined && labelProps)}
        {...props}
      >
        {children ?? (
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput {...labelProps} />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        )}
      </NumberFieldPrimitive.Root>
    </NumberFieldContext>
  )
}

NumberFieldRoot.displayName = 'NumberField.Root'
