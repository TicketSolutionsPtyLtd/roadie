'use client'

import { type ChangeEvent, type ComponentProps, useMemo, useState } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'
import { cva } from 'class-variance-authority'

import {
  formatPhone,
  parsePhone,
  phoneCountries
} from '@oztix/roadie-core/phone'
import { cn } from '@oztix/roadie-core/utils'

import { Combobox } from '../Combobox'
import { useFieldContext } from '../Field'
import { useFieldControlProps } from '../Field/FieldContext'

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
  /** The chosen country's ISO code. A number with its own dial code wins over it. Pair with `onCountryChange`. */
  country?: string
  /**
   * The country to start with when the number doesn't name one.
   *
   * @default 'AU'
   */
  defaultCountry?: string
  /** Called when someone picks a country, or enters a number from another one. */
  onCountryChange?: (country: string) => void
  /** ISO codes that narrow the picker, in the order given. Every country, by name, when left off or empty. */
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
  /**
   * The name and placeholder of the picker's search.
   *
   * @default 'Search countries'
   */
  searchLabel?: string
  /**
   * What the picker says when the search matches no country.
   *
   * @default 'No countries found'
   */
  emptyMessage?: string
  /**
   * The field's height, matching `Input`.
   *
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /** The form field the E.164 number submits under. */
  name?: string
  /** Turns off both controls and leaves the number out of a form. */
  disabled?: boolean
  /** Shows the number and its country without letting either change. */
  readOnly?: boolean
  /** Classes for the outline around both controls. */
  className?: string
}

type Country = { code: string; dialCode: string; name: string }

type Draft = {
  text: string
  country: string
  /** The value last given or reported, so a different one is someone else's change. */
  expected: string | undefined
  /** The `country` prop last seen, so the draft follows it only when it changes. */
  given: string | undefined
}

const FALLBACK_COUNTRY = 'AU'
const FALLBACK_LOCALE = 'en-AU'
const VIRTUALIZE_PAST = 15

const dialCodes = /* @__PURE__ */ new Map(
  phoneCountries.map(({ code, dialCode }) => [code, dialCode])
)

const knownCountry = (code: string | undefined) => {
  const upper = code?.toUpperCase()
  return upper !== undefined && dialCodes.has(upper) ? upper : undefined
}

// Intl throws on a tag it can't read, such as en_AU.
function readableLocale(locale: string) {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? FALLBACK_LOCALE
  } catch {
    return FALLBACK_LOCALE
  }
}

// Regional indicator letters, which fonts draw as the country's flag.
const flagOf = (code: string) =>
  String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1a5 + letter.charCodeAt(0))
  )

// The same two tests parsePhone uses for an international number.
const PLUS = /^[^\d+＋]*[+＋]/
const isInternational = (text: string) =>
  PLUS.test(text) || text.replace(/\D/g, '').startsWith('00')

// What follows the dial code, as typed, so a pasted number keeps its spacing.
function afterDialCode(text: string, dialCode: string) {
  let left = dialCode.length + (PLUS.test(text) ? 0 : 2)
  let index = 0
  while (index < text.length && left > 0) {
    if (/\d/.test(text[index] ?? '')) left -= 1
    index += 1
  }
  return text.slice(index).replace(/^[\s)-]+/, '')
}

function read(text: string, country: string) {
  const parsed = parsePhone(text, country)
  // A number whose dial code the table lacks is kept as its digits, not lost.
  const unknown =
    isInternational(text) && parsed.national ? `+${parsed.national}` : ''
  return { ...parsed, value: parsed.e164 || unknown }
}

function draftOf(value: string, country: string) {
  const parsed = parsePhone(value, country)
  if (!parsed.e164) return { country, text: value.trim() }
  const national = formatPhone(parsed.e164, 'national')
  return {
    country: parsed.country ?? country,
    // Only grouped countries have a national form; the rest show their digits.
    text: national.startsWith('+') ? parsed.national : national
  }
}

/** A phone number field with a country code picker. Its value is E.164. */
export function PhoneField({
  value,
  defaultValue = '',
  onValueChange,
  country: countryProp,
  defaultCountry,
  onCountryChange,
  countries,
  locale: localeProp = FALLBACK_LOCALE,
  countryLabel = 'Country code',
  searchLabel = 'Search countries',
  emptyMessage = 'No countries found',
  size = 'md',
  name,
  form,
  disabled: disabledProp,
  readOnly,
  className,
  style,
  onChange,
  'aria-describedby': describedBy,
  ...props
}: PhoneFieldProps) {
  const field = useFieldContext()
  const fieldProps = useFieldControlProps({ 'aria-describedby': describedBy })
  const disabled = disabledProp ?? field.disabled ?? false
  const locale = readableLocale(localeProp)
  const given = knownCountry(countryProp)

  const [draft, setDraft] = useState<Draft>(() => ({
    ...draftOf(
      value ?? defaultValue,
      given ?? knownCountry(defaultCountry) ?? FALLBACK_COUNTRY
    ),
    expected: value,
    given
  }))
  let current = draft
  if (value !== undefined && value !== current.expected)
    current = {
      ...current,
      ...draftOf(value, current.country),
      expected: value
    }
  if (given !== current.given)
    current = { ...current, country: given ?? current.country, given }
  if (current !== draft) setDraft(current)

  const { country } = current
  const dialCode = dialCodes.get(country) ?? ''

  const listed = countries?.join(',')
  const options = useMemo(() => {
    const names = new Intl.DisplayNames(locale, { type: 'region' })
    const named = (code: string): Country => ({
      code,
      dialCode: dialCodes.get(code) ?? '',
      name: names.of(code) ?? code
    })
    const narrowed = [
      ...new Set((listed ?? '').split(',').map((code) => code.toUpperCase()))
    ].filter((code) => dialCodes.has(code))
    if (narrowed.length > 0) return narrowed.map(named)
    return [...dialCodes.keys()]
      .map(named)
      .sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [listed, locale])
  const chosen = useMemo(
    () =>
      options.find((option) => option.code === country) ?? {
        code: country,
        dialCode,
        name:
          new Intl.DisplayNames(locale, { type: 'region' }).of(country) ??
          country
      },
    [options, country, dialCode, locale]
  )

  const report = (text: string, nextCountry: string) => {
    const next = read(text, nextCountry)
    setDraft({ ...current, text, country: nextCountry, expected: next.value })
    if (nextCountry !== country) onCountryChange?.(nextCountry)
    onValueChange?.(next.value, {
      country: nextCountry,
      national: next.national,
      possible: next.possible
    })
  }

  const countryIn = (text: string) =>
    isInternational(text) ? parsePhone(text, country).country : null

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event)
    const text = event.target.value
    const own = countryIn(text)
    if (own === null) return report(text, country)
    // Typing leaves the text alone, caret and all; a paste or autofill replaces it, so only then does the dial code go.
    const kind = (event.nativeEvent as InputEvent).inputType
    const typing = kind?.startsWith('insertText') || kind?.startsWith('delete')
    report(typing ? text : afterDialCode(text, dialCodes.get(own) ?? ''), own)
  }

  const pick = (picked: string) => {
    const own = countryIn(current.text)
    report(
      own === null
        ? current.text
        : afterDialCode(current.text, dialCodes.get(own) ?? ''),
      picked
    )
  }

  const label = props['aria-label']
  const invalid =
    field.invalid ||
    props['aria-invalid'] === true ||
    props['aria-invalid'] === 'true'

  return (
    <div
      data-slot='phone-field'
      role='group'
      aria-label={label}
      aria-labelledby={label ? undefined : field.labelId || undefined}
      aria-invalid={invalid || undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn(phoneFieldVariants({ size }), className)}
      style={style}
    >
      <Combobox<Country>
        items={options}
        virtualized={options.length > VIRTUALIZE_PAST}
        value={chosen}
        onValueChange={(picked) => {
          if (picked) pick(picked.code)
        }}
        itemToStringLabel={(option) =>
          `${option.name} +${option.dialCode} ${option.code}`
        }
        isItemEqualToValue={(a, b) => a.code === b.code}
        locale={locale}
        disabled={disabled}
        readOnly={readOnly}
      >
        <ComboboxPrimitive.Trigger
          data-slot='phone-field-country'
          aria-label={`${countryLabel}: ${chosen.name} +${dialCode}`}
          // Engines name a few countries differently, so the server's name can differ.
          suppressHydrationWarning
          className={cn(
            'flex h-full shrink-0 items-center gap-1 rounded-s-lg rounded-e-none px-2 emphasis-subtler',
            // The group already dims a disabled field; is-interactive would dim the picker twice.
            !disabled && 'is-interactive'
          )}
        >
          <span aria-hidden='true'>{flagOf(country)}</span>
          <span className='tabular-nums'>+{dialCode}</span>
          <CaretDownIcon weight='bold' className='size-4 text-subtle' />
        </ComboboxPrimitive.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner align='start'>
            <Combobox.Popup
              aria-label={countryLabel}
              className='grid max-h-[min(var(--available-height),--spacing(80))] w-72 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0'
            >
              {/* Base UI's input, as the search isn't the field's control. */}
              <ComboboxPrimitive.Input
                data-slot='phone-field-search'
                aria-label={searchLabel}
                placeholder={searchLabel}
                className='h-10 min-w-0 flex-none border-b border-subtle bg-transparent px-3 text-base outline-none placeholder:text-subtle'
              />
              <div className='overflow-y-auto p-1'>
                <Combobox.List>
                  {(option: Country) => (
                    <Combobox.Item key={option.code} value={option}>
                      <span aria-hidden='true'>{flagOf(option.code)}</span>
                      <span className='min-w-0 flex-1 truncate'>
                        {option.name}
                      </span>
                      <span className='text-subtle tabular-nums'>
                        +{option.dialCode}
                      </span>
                      {/* A slot on every row, so the check doesn't shift the chosen row's dial code. */}
                      <span className='grid size-4 shrink-0 place-items-center'>
                        <Combobox.ItemIndicator />
                      </span>
                    </Combobox.Item>
                  )}
                </Combobox.List>
                <Combobox.Empty>{emptyMessage}</Combobox.Empty>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox>
      <input
        data-slot='phone-field-input'
        type='tel'
        inputMode='tel'
        autoComplete='tel'
        className='h-full min-w-0 flex-1 rounded-lg bg-transparent px-2 outline-none placeholder:text-subtle'
        {...fieldProps}
        {...props}
        form={form}
        disabled={disabled}
        readOnly={readOnly}
        value={current.text}
        onChange={handleChange}
      />
      {name !== undefined && (
        <input
          type='hidden'
          name={name}
          form={form}
          value={read(current.text, country).value}
          disabled={disabled}
        />
      )}
    </div>
  )
}

PhoneField.displayName = 'PhoneField'
