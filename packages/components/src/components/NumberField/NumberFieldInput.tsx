'use client'

import {
  type CSSProperties,
  type KeyboardEvent,
  type RefAttributes,
  use,
  useState
} from 'react'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'
import NumberFlow, { type Format } from '@number-flow/react'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { NumberFieldContext } from './NumberFieldContext'

export type NumberFieldInputProps = NumberFieldPrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

/**
 * The input and an animated copy of its value share one grid cell. The
 * animated number is the visible layer; the input's text only shows once
 * someone taps into it or types, and any step after that hands the display
 * back to the animation. Focus alone doesn't count, because Base UI focuses
 * the input whenever a mouse presses a stepper button.
 */
export function NumberFieldInput({
  className,
  onPointerDown,
  onKeyDown,
  onBlur,
  ...props
}: NumberFieldInputProps) {
  const {
    invalid,
    emphasis,
    value,
    min,
    max,
    locale,
    format,
    editable = true,
    stepCount = 0,
    pointerFocus,
    setPointerFocus
  } = use(NumberFieldContext)
  const { errorTextId, helperTextId } = useFieldContext()
  const [editingSince, setEditingSince] = useState<number | null>(null)
  const chip = emphasis === 'subtler' && editable
  const flowFormat = animatableFormat(format)
  const animates = value != null && flowFormat !== null
  const editing = editable && editingSince === stepCount
  const showsText = !animates || editing

  return (
    <span
      data-slot='number-field-value'
      style={
        {
          '--number-field-chars': valueChars(min, max, locale, format)
        } as CSSProperties
      }
      className={cn(
        'grid h-full flex-1 place-items-center',
        // Room for the widest value plus 0.5rem either side. Editable fields
        // keep a tap target of at least 2.75rem, 3.5rem on touch screens.
        editable
          ? 'min-w-[max(calc(var(--number-field-chars)*1ch+1rem),2.75rem)] pointer-coarse:min-w-[max(calc(var(--number-field-chars)*1ch+1rem),3.5rem)]'
          : 'min-w-[calc(var(--number-field-chars)*1ch+1rem)]'
      )}
    >
      <NumberFieldPrimitive.Input
        data-slot='number-field-input'
        className={cn(
          // Zero width with a full min-width lets the value cell, not the
          // input's default size, decide the width.
          'col-start-1 row-start-1 h-full w-0 min-w-full text-center text-normal tabular-nums placeholder:text-subtle',
          // With no field box, an editable value gets a chip that behaves like
          // a subtle Input: hover, accent focus, danger when invalid. The
          // transition list adds text colour to the field's own.
          chip
            ? 'is-interactive-field rounded-md border border-transparent bg-subtle transition-[color,background-color,border-color,box-shadow,outline-width,outline-color] duration-150'
            : 'bg-transparent transition-colors duration-150 outline-none',
          !editable &&
            'cursor-default caret-transparent select-none selection:bg-transparent',
          // Only the text hides, so a background on the input still shows.
          !showsText && 'text-transparent',
          className
        )}
        data-editing={editing || undefined}
        data-pointer-focus={pointerFocus || undefined}
        readOnly={!editable || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={(invalid ? errorTextId : helperTextId) || undefined}
        onPointerDown={(event) => {
          setPointerFocus?.(false)
          setEditingSince(stepCount)
          onPointerDown?.(event)
        }}
        onKeyDown={(event) => {
          setPointerFocus?.(false)
          if (event.key === 'Escape') setEditingSince(null)
          else if (editsText(event)) setEditingSince(stepCount)
          onKeyDown?.(event)
        }}
        onBlur={(event) => {
          setPointerFocus?.(false)
          setEditingSince(null)
          onBlur?.(event)
        }}
        {...props}
      />
      {animates && (
        // Clipped here rather than on the row: the digit slide overshoots by a
        // fraction of a pixel, and clipping the row would cut the buttons'
        // press scale.
        <NumberFlow
          aria-hidden='true'
          value={value}
          locales={locale}
          format={flowFormat}
          className={cn(
            'pointer-events-none col-start-1 row-start-1 overflow-hidden text-normal tabular-nums transition-opacity duration-150',
            editing && 'opacity-0'
          )}
        />
      )}
    </span>
  )
}

NumberFieldInput.displayName = 'NumberField.Input'

function valueChars(
  min: number | undefined,
  max: number | undefined,
  locale: Intl.LocalesArgument,
  format: Intl.NumberFormatOptions | undefined
) {
  const formatter = new Intl.NumberFormat(locale, format)
  const lengths = [min, max]
    .filter((bound) => bound !== undefined && Number.isFinite(bound))
    .map((bound) => formatter.format(bound as number).length)
  if (max === undefined) lengths.push(3)
  return Math.max(1, ...lengths)
}

function editsText(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  return (
    event.key.length === 1 ||
    event.key === 'Backspace' ||
    event.key === 'Delete'
  )
}

function animatableFormat(
  format: Intl.NumberFormatOptions | undefined
): Format | undefined | null {
  if (format?.notation === 'scientific' || format?.notation === 'engineering') {
    return null
  }
  return format as Format | undefined
}
