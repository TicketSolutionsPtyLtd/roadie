'use client'

import type { ReactNode, RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { SliderContext } from './SliderContext'
import { SliderControl } from './SliderControl'
import { SliderIndicator } from './SliderIndicator'
import { SliderLabel } from './SliderLabel'
import { SliderThumb } from './SliderThumb'
import { SliderTrack } from './SliderTrack'
import { SliderValue } from './SliderValue'

type SliderValueType = number | readonly number[]

export type SliderRootProps<Value extends SliderValueType = SliderValueType> =
  SliderPrimitive.Root.Props<Value> &
    RefAttributes<HTMLDivElement> & {
      /** A visible label, with the value shown beside it. Leave it out inside `Field`. */
      label?: ReactNode
      /** Marks the slider invalid. Inherits from `Field` when unset. */
      invalid?: boolean
    }

function countThumbs(value: SliderValueType | undefined) {
  return Array.isArray(value) ? value.length : 1
}

export function SliderRoot<Value extends SliderValueType>({
  label,
  invalid,
  disabled,
  locale = 'en-AU',
  className,
  children,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: SliderRootProps<Value>) {
  const field = useFieldContext()
  const inField = !!field.fieldId
  const resolvedInvalid = invalid ?? field.invalid
  const fieldTextId = resolvedInvalid ? field.errorTextId : field.helperTextId
  const thumbCount = countThumbs(props.value ?? props.defaultValue)

  return (
    <SliderContext
      value={{
        invalid: resolvedInvalid,
        describedBy: (inField && fieldTextId) || undefined,
        fieldId: field.fieldId || undefined
      }}
    >
      <SliderPrimitive.Root<Value>
        data-slot='slider'
        data-invalid={resolvedInvalid ? '' : undefined}
        aria-labelledby={
          ariaLabelledBy ?? (inField && !label ? field.labelId : undefined)
        }
        disabled={disabled ?? field.disabled}
        locale={locale}
        className={cn(
          'group/slider grid w-full grid-cols-[1fr_auto] items-baseline gap-x-3',
          'data-[orientation=vertical]:w-auto',
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            {label != null && (
              <>
                <SliderLabel>{label}</SliderLabel>
                <SliderValue />
              </>
            )}
            <SliderControl>
              <SliderTrack>
                <SliderIndicator />
                {Array.from({ length: thumbCount }, (_, index) => (
                  <SliderThumb key={index} index={index} />
                ))}
              </SliderTrack>
            </SliderControl>
          </>
        )}
      </SliderPrimitive.Root>
    </SliderContext>
  )
}

SliderRoot.displayName = 'Slider.Root'
