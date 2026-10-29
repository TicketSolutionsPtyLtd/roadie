import type { ShowWhen } from '../schema/showWhen'
import type { EditorVariable } from '../schema/variables'
import type { Filled, MergeTagOptions } from './mergeTags'

/**
 * Whether a block with `rule` shows: always, never, or around the
 * placeholders that open and close the sending system's condition.
 */
export type ShowsWhen = (
  rule: ShowWhen
) => boolean | { open: string; close: string }

const OPERATORS = {
  equals: '==',
  notEquals: '!=',
  lessThan: '<',
  greaterThan: '>'
} as const

// The tag ends at the first `%}`, even in a string, and strings have no escapes.
function liquidLiteral(value: string | number) {
  const written = String(value)
  if (typeof value === 'number') {
    if (/e/i.test(written)) {
      throw new RangeError(`Liquid can’t write the number ${written}.`)
    }
    return written
  }
  if (!written.includes('%}')) {
    if (!written.includes('"')) return `"${written}"`
    if (!written.includes("'")) return `'${written}'`
  }
  throw new RangeError(
    `A Liquid string can’t hold ${JSON.stringify(written)}: it has both quotes or a %}.`
  )
}

const BARE_PATH =
  /^\{\{-?\s*([A-Za-z_](?:[\w-]*\w)?(?:\.[A-Za-z_](?:[\w-]*\w)?)*)\s*-?\}\}$/

const LIQUID_KEYWORDS = new Set([
  'and',
  'or',
  'contains',
  'empty',
  'blank',
  'nil',
  'null',
  'true',
  'false'
])

// Liquid takes no filters in an `if`, and a filtered value isn't the raw one.
function liquidPath({ key, tokens }: EditorVariable) {
  if (!tokens.liquid) {
    throw new RangeError(`The variable "${key}" has no liquid token.`)
  }
  const path = BARE_PATH.exec(tokens.liquid)?.[1]
  if (!path || LIQUID_KEYWORDS.has(path.split('.')[0]!)) {
    throw new RangeError(
      `The variable "${key}" can’t be in a condition: its Liquid token isn’t a plain variable.`
    )
  }
  return path
}

function liquidCondition(path: string, rule: ShowWhen) {
  if (rule.op === 'exists') return `${path} and ${path} != ""`
  return `${path} ${OPERATORS[rule.op]} ${liquidLiteral(rule.value)}`
}

// Liquid reads only decimal numbers, never hex or exponents.
const numberIn = (value: string | undefined) =>
  /^\s*-?\d+(\.\d+)?\s*$/.test(String(value)) ? Number(value) : undefined

const matches = (value: string | undefined, wanted: string | number) =>
  typeof wanted === 'number' ? numberIn(value) === wanted : value === wanted

function holds(rule: ShowWhen, values: Readonly<Record<string, string>>) {
  const value = Object.hasOwn(values, rule.key) ? values[rule.key] : undefined
  const number = numberIn(value)
  switch (rule.op) {
    case 'exists':
      return Boolean(value)
    case 'equals':
      return matches(value, rule.value)
    case 'notEquals':
      return !matches(value, rule.value)
    case 'lessThan':
      return number !== undefined && number < rule.value
    case 'greaterThan':
      return number !== undefined && number > rule.value
  }
}

/**
 * Checks each rule against `variables`, then shows or hides its block for a
 * preview with `values`, or wraps it in a Liquid `if`. The AE syntax has no
 * conditions, so a rule throws there.
 */
export function conditions(
  { syntax, variables = [], values }: MergeTagOptions,
  hold: (held: Filled) => string
): ShowsWhen {
  return (rule) => {
    const variable = variables.find((listed) => listed.key === rule.key)
    if (!variable) {
      throw new RangeError(`No variable has the key "${rule.key}".`)
    }
    if (syntax === 'ae') {
      throw new TypeError('The ae syntax has no conditions to show a block.')
    }
    if (values) return holds(rule, values)
    if (!syntax) {
      throw new TypeError(
        'renderEmail needs a syntax to write conditions, or values to check them.'
      )
    }
    const condition = liquidCondition(liquidPath(variable), rule)
    // The plain text trims the line break before each tag, so a hidden block
    // leaves no blank lines.
    return {
      open: hold({
        html: `{% if ${condition} %}`,
        text: `{%- if ${condition} %}`
      }),
      close: hold({ html: '{% endif %}', text: '{%- endif %}' })
    }
  }
}
