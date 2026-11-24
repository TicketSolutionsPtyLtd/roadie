'use client'

import { type ChangeEvent, type ComponentProps, useMemo, useState } from 'react'

import { cva } from 'class-variance-authority'

import {
  formatPhone,
  parsePhone,
  phoneCountries
} from '@oztix/roadie-core/phone'
import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext, useFieldInputProps } from '../Field'
import { Select } from '../Select'

export const phoneFieldVariants = cva(
  'flex w-full items-center rounded-lg font-sans text-base emphasis-field is-interactive-field-group',
  {
    variants: {
      size: {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12'
      }
    },
    defaultVariants: { size: 'md' }
  }
)

export type PhoneFieldValueDetails = {
  /** The chosen country's ISO code, such as `AU`. */
  country: string
  /** The digits after the dial code, with no trunk prefix. */
  national: string
  /** The number's length fits its country. Not a check that the number exists. */
  possible: boolean
}

export type PhoneFieldProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'size' | 'type'
> & {
  /** The number as E.164, such as `+61412345678`, or `''`. */
  value?: string
  /** The number to start with, as E.164, when uncontrolled. */
  defaultValue?: string
  /** Called on every edit and country change, with the E.164 number, or `''` until there are digits. */
  onValueChange?: (value: string, details: PhoneFieldValueDetails) => void
  /** The chosen country's ISO code. Pair with `onCountryChange`. */
  country?: string
  /**
   * The country to start with when the number doesn't name one.
   *
   * @default 'AU'
   */
  defaultCountry?: string
  /** Called when someone picks a country, or pastes a number from another one. */
  onCountryChange?: (country: string) => void
  /** ISO codes that narrow the picker, in the order given. Every country, by name, when left off. */
  countries?: readonly string[]
  /**
   * The language country names are in.
   *
   * @default 'en-AU'
   */
  locale?: string
  /**
   * The picker's accessible name, read before the chosen country.
   *
   * @default 'Country code'
   */
  countryLabel?: string
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
}

type Draft = {
  text: string
  country: string
  /** The value last given or reported, so a different one is someone else's change. */
  expected: string | undefined
}

// Regional indicator letters, which fonts draw as the country's flag.
const flagOf = (code: string) =>
  String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1a5 + letter.charCodeAt(0))
  )

const dialCodes = /* @__PURE__ */ new Map(
  phoneCountries.map(({ code, dialCode }) => [code, dialCode])
)

function draftOf(value: string, country: string) {
  const parsed = parsePhone(value, country)
  const national = formatPhone(parsed.e164, 'national')
  return {
    country: parsed.country ?? country,
    // Only grouped countries have a national form; the rest show their digits.
    text: national.startsWith('+') ? parsed.national : national
  }
}

// The same leading plus or 00 that parsePhone reads as international.
const INTERNATIONAL = /^[^\d+\uff0b]*(?:[+\uff0b]|00)/

// What follows the dial code, as typed, so a pasted number keeps its spacing.
function afterDialCode(text: string, dialCode: string) {
  const zeros = INTERNATIONAL.exec(text)?.[0].endsWith('00') ? 2 : 0
  let left = dialCode.length + zeros
  let index = 0
  while (index < text.length && left > 0) {
    if (/\d/.test(text[index] ?? '')) left -= 1
    index += 1
  }
  return text.slice(index).replace(/^[\s)-]+/, '')
}

/** A phone number field with a country code picker. Its value is E.164. */
export function PhoneField({
  value,
  defaultValue = '',
  onValueChange,
  country: countryProp,
  defaultCountry = 'AU',
  onCountryChange,
  countries,
  locale = 'en-AU',
  countryLabel = 'Country code',
  size = 'md',
  name,
  disabled: disabledProp,
  className,
  onChange,
  ...props
}: PhoneFieldProps) {
  const field = useFieldContext()
  const fieldProps = useFieldInputProps()
  const disabled = disabledProp ?? field.disabled ?? false

  const [draft, setDraft] = useState<Draft>(() => ({
    ...draftOf(
      value ?? defaultValue,
      (countryProp ?? defaultCountry).toUpperCase()
    ),
    expected: value
  }))
  let current = draft
  if (value !== undefined && value !== draft.expected) {
    current = { ...draftOf(value, draft.country), expected: value }
    setDraft(current)
  }

  const country = countryProp?.toUpperCase() ?? current.country
  const dialCode = dialCodes.get(country) ?? ''
  const e164 = parsePhone(current.text, country).e164

  const listed = countries?.join(',')
  const options = useMemo(() => {
    const names = new Intl.DisplayNames(locale, { type: 'region' })
    const named = (code: string) => ({
      code,
      dialCode: dialCodes.get(code) ?? '',
      name: names.of(code) ?? code
    })
    if (listed !== undefined)
      return listed
        .split(',')
        .map((code) => code.toUpperCase())
        .filter((code) => dialCodes.has(code))
        .map(named)
    return [...dialCodes.keys()]
      .map(named)
      .sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [listed, locale])
  const countryName =
    options.find((option) => option.code === country)?.name ??
    new Intl.DisplayNames(locale, { type: 'region' }).of(country) ??
    country

  const report = (text: string, chosen: string) => {
    const typed = parsePhone(text, chosen)
    // A number with its own dial code names its country, and only the rest stays in the box.
    const next =
      INTERNATIONAL.test(text) && typed.country !== null
        ? {
            country: typed.country,
            text: afterDialCode(text, dialCodes.get(typed.country) ?? '')
          }
        : { country: chosen, text }
    const parsed = parsePhone(next.text, next.country)
    setDraft({ ...next, expected: parsed.e164 })
    if (next.country !== country) onCountryChange?.(next.country)
    onValueChange?.(parsed.e164, {
      country: next.country,
      national: parsed.national,
      possible: parsed.possible
    })
  }

  return (
    <div
      data-slot='phone-field'
      role='group'
      aria-labelledby={field.labelId || undefined}
      aria-invalid={field.invalid || undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn(phoneFieldVariants({ size }), className)}
    >
      <Select<string>
        value={country}
        onValueChange={(chosen) => {
          if (chosen) report(current.text, chosen)
        }}
        disabled={disabled}
        invalid={false}
        required={false}
      >
        <Select.Trigger
          data-slot='phone-field-country'
          emphasis='subtler'
          aria-label={`${countryLabel}: ${countryName} +${dialCode}`}
          aria-labelledby={undefined}
          aria-describedby={undefined}
          aria-required={undefined}
          className='h-full shrink-0 rounded-lg px-2'
        >
          <Select.Value>
            <span aria-hidden='true'>{flagOf(country)}</span> +{dialCode}
          </Select.Value>
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          {options.map((option) => (
            <Select.Item key={option.code} value={option.code}>
              <span aria-hidden='true'>{flagOf(option.code)}</span>
              <Select.ItemText className='min-w-0 flex-1 truncate'>
                {option.name}
              </Select.ItemText>
              <span className='text-subtle tabular-nums'>
                +{option.dialCode}
              </span>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      <input
        data-slot='phone-field-input'
        type='tel'
        inputMode='tel'
        autoComplete='tel-national'
        className='h-full min-w-0 flex-1 rounded-lg bg-transparent px-2 outline-none placeholder:text-subtler'
        {...fieldProps}
        {...props}
        disabled={disabled}
        value={current.text}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event)
          report(event.target.value, country)
        }}
      />
      {name !== undefined && (
        <input type='hidden' name={name} value={e164} disabled={disabled} />
      )}
    </div>
  )
}

PhoneField.displayName = 'PhoneField'
