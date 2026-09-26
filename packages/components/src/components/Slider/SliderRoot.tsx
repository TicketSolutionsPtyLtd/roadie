'use client'

import type { ReactNode, RefAttributes } from 'react'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@oztix/roadie-core/utils'

import { isEmptyNode } from '../../utils/isEmptyNode'
import { useFieldContext } from '../Field'
import { SliderContext, type SliderSize } from './SliderContext'
import { SliderControl } from './SliderControl'
import { SliderIndicator } from './SliderIndicator'
import { SliderLabel } from './SliderLabel'
import { SliderThumb } from './SliderThumb'
import { SliderTrack } from './SliderTrack'
import { SliderValue } from './SliderValue'

type SliderValueType = number | readonly number[]

export type SliderDirection = 'horizontal' | 'vertical'

export type SliderRootProps<Value extends SliderValueType = SliderValueType> =
  Omit<SliderPrimitive.Root.Props<Value>, 'orientation'> &
    RefAttributes<HTMLDivElement> & {
      /**
       * Which way the track runs. `vertical` runs up the page.
       * @default 'horizontal'
       */
      direction?: SliderDirection
      /** @default 'md' */
      size?: SliderSize
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
  direction = 'horizontal',
  size = 'md',
  locale = 'en-AU',
  className,
  children,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: SliderRootProps<Value>) {
  const field = useFieldContext()
  const inField = !!field.fieldId
  const hasLabel = !isEmptyNode(label)
  const resolvedInvalid = invalid ?? field.invalid
  // Field.ErrorText renders from the field's own invalid, not the slider's.
  const fieldTextId = field.invalid ? field.errorTextId : field.helperTextId
  const thumbCount = countThumbs(props.value ?? props.defaultValue)

  return (
    <SliderContext
      value={{
        size,
        invalid: resolvedInvalid,
        describedBy: (inField && fieldTextId) || undefined,
        fieldId: field.fieldId || undefined
      }}
    >
      <SliderPrimitive.Root<Value>
        data-slot='slider'
        data-invalid={resolvedInvalid ? '' : undefined}
        aria-labelledby={
          ariaLabelledBy ?? (inField && !hasLabel ? field.labelId : undefined)
        }
        disabled={disabled ?? field.disabled}
        orientation={direction}
        locale={locale}
        className={cn(
          'group/slider grid w-full grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1.5',
          'data-[orientation=vertical]:w-auto',
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            {hasLabel && (
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
