import { PHONE_FORMATS, PHONE_TABLE } from './table'

export type PhoneCountry = {
  /** ISO 3166-1 alpha-2, such as `AU`. */
  code: string
  /** The country calling code without its plus, such as `61`. */
  dialCode: string
}

export type PhoneParse = {
  /** The number's country, or `null` when neither the input nor the default names one Roadie knows. */
  country: string | null
  /** The digits after the dial code, with no trunk prefix. */
  national: string
  /** `+`, the dial code and the national number, or `''` when there is no country or no digits. */
  e164: string
  /** The national number's length fits its country. Not a check that the number exists. */
  possible: boolean
}

export type PhoneFormatStyle = 'international' | 'national'

type Plan = {
  dialCode: string
  /** Each length a national number can be, as a base 36 digit. */
  lengths: string
  trunk: string
  /** Real numbers can start with the trunk prefix, as Gabon's do. */
  trunkInNumbers: boolean
}

function readTable() {
  const plans = new Map<string, Plan>()
  const mainCountry = new Map<string, string>()
  for (const row of PHONE_TABLE.split(';')) {
    const [code = '', dialCode = '', lengths = '', trunk = ''] = row.split(',')
    plans.set(code, {
      dialCode,
      lengths,
      trunk: trunk.replace('!', ''),
      trunkInNumbers: trunk.endsWith('!')
    })
    // The table lists a dial code's main country first.
    if (!mainCountry.has(dialCode)) mainCountry.set(dialCode, code)
  }
  return { plans, mainCountry }
}

const { plans, mainCountry } = /* @__PURE__ */ readTable()

const formats = /* @__PURE__ */ PHONE_FORMATS.split(';').map((row) =>
  row.split('~')
)

/** Every country with a calling code, in code order. Name them with `Intl.DisplayNames`. */
export const phoneCountries: readonly PhoneCountry[] = /* @__PURE__ */ [
  ...plans
]
  .map(([code, { dialCode }]) => ({ code, dialCode }))
  .sort((a, b) => (a.code < b.code ? -1 : 1))

const fits = (plan: Plan, length: number) =>
  length > 0 && plan.lengths.includes(length.toString(36))

// A leading trunk prefix goes, unless the country's numbers can start with it and this one is a full number as typed.
function dropTrunk(plan: Plan, digits: string) {
  if (!plan.trunk || !digits.startsWith(plan.trunk)) return digits
  if (plan.trunkInNumbers && fits(plan, digits.length)) return digits
  return digits.slice(plan.trunk.length)
}

// Calling codes are prefix-free, so at most one length matches.
function splitDialCode(digits: string) {
  for (let length = 1; length <= 3; length++) {
    const dialCode = digits.slice(0, length)
    if (mainCountry.has(dialCode)) return dialCode
  }
  return null
}

const nothing = (country: string | null, national: string): PhoneParse => ({
  country,
  national,
  e164: '',
  possible: false
})

/**
 * Reads what someone typed or pasted as a phone number. Spaces, brackets and
 * hyphens are ignored, a leading `+` or `00` makes it international, and
 * anything else belongs to `defaultCountry`.
 */
export function parsePhone(input: string, defaultCountry?: string): PhoneParse {
  const digits = input.replace(/\D/g, '')
  const fallback = defaultCountry?.toUpperCase()
  const known = fallback !== undefined && plans.has(fallback) ? fallback : null
  // The plus can sit inside a bracket, as in (+61).
  const plus = /^[\s(]*\+/.test(input)
  const international = plus || digits.startsWith('00')

  if (!international) {
    const plan = known === null ? undefined : plans.get(known)
    if (!plan || !digits) return nothing(known, digits)
    return complete(known, plan, digits)
  }

  const rest = plus ? digits : digits.slice(2)
  const dialCode = splitDialCode(rest)
  if (dialCode === null) return nothing(null, rest)
  // Canada shares +1 with the United States, so a default that shares the code stays.
  const country =
    known !== null && plans.get(known)?.dialCode === dialCode
      ? known
      : (mainCountry.get(dialCode) ?? null)
  const plan = country === null ? undefined : plans.get(country)
  if (!plan) return nothing(null, rest)
  return complete(country, plan, rest.slice(dialCode.length))
}

function complete(
  country: string | null,
  plan: Plan,
  digits: string
): PhoneParse {
  const national = dropTrunk(plan, digits)
  return {
    country,
    national,
    e164: national ? `+${plan.dialCode}${national}` : '',
    possible: fits(plan, national.length)
  }
}

/** Whether an E.164 number's length fits its country. The server decides whether it is real. */
export function isPossiblePhone(e164: string): boolean {
  return e164.startsWith('+') && parsePhone(e164).possible
}

/**
 * An E.164 number for reading. `international` is `+61 412 345 678` and
 * `national` is `0412 345 678`. Countries without grouping patterns read as
 * the dial code and the digits in both styles, and text that isn't E.164
 * comes back unchanged.
 */
export function formatPhone(
  e164: string,
  style: PhoneFormatStyle = 'international'
): string {
  if (!e164.startsWith('+')) return e164
  const { country, national } = parsePhone(e164)
  const plan = country === null ? undefined : plans.get(country)
  if (country === null || !plan || !national) return e164

  const format = formats.find(
    ([code, pattern, , leading]) =>
      code === country &&
      new RegExp(`^(?:${leading})`).test(national) &&
      new RegExp(`^(?:${pattern})$`).test(national)
  )
  if (!format) return `+${plan.dialCode} ${national}`

  const [, pattern = '', groups = '', , nationalRule] = format
  const grouped = (template: string) =>
    national.replace(new RegExp(`^(?:${pattern})$`), template)
  return style === 'national'
    ? grouped(nationalRule ? groups.replace('$1', nationalRule) : groups)
    : `+${plan.dialCode} ${grouped(groups)}`
}
