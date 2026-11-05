import type { EditorVariable } from './variables'

/** A variable a token names, with the fallback a Liquid `default` gives it. */
export type ReadToken = { variable: EditorVariable; fallback?: string }

const LIQUID = String.raw`\{\{-?[\s\S]*?-?\}\}|\{%-?[\s\S]*?-?%\}`
// `#FirstName#` and `[ViewInBrowserLink]`; `[1]`, a footnote, isn't one.
const AE_LIKE = String.raw`#[A-Za-z]\w*#|\[[A-Za-z]\w*\]`
const LIQUID_OUTPUT = /^\{\{-?([\s\S]*?)-?\}\}$/
const WITH_DEFAULT = /^([\s\S]*?)\|\s*default:\s*(?:"([^"]*)"|'([^']*)')\s*$/

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whitespace inside a Liquid output is free, so `{{x}}` is `{{ x }}`.
const liquidKey = (expression: string) =>
  expression
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([|:,])\s*/g, '$1')

/**
 * Reads merge tag tokens, such as `#FirstName#` or
 * `{{ customer.first_name | default: "there" }}`, as the variables whose
 * tokens they are. `pattern` finds them and anything else written like one.
 */
export function mergeTagTokens(variables: readonly EditorVariable[]) {
  const ae = new Map<string, EditorVariable>()
  const liquid = new Map<string, EditorVariable>()
  for (const variable of variables) {
    const { ae: aeToken, liquid: liquidToken } = variable.tokens
    if (aeToken) ae.set(aeToken, variable)
    const output = liquidToken && LIQUID_OUTPUT.exec(liquidToken)
    if (output) liquid.set(liquidKey(output[1]!), variable)
  }
  const literals = [...ae.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escaped)
  const pattern = new RegExp([...literals, LIQUID, AE_LIKE].join('|'), 'g')

  function read(token: string): ReadToken | undefined {
    const known = ae.get(token)
    if (known) return { variable: known }
    const expression = LIQUID_OUTPUT.exec(token)?.[1]
    if (expression === undefined) return undefined
    const exact = liquid.get(liquidKey(expression))
    if (exact) return { variable: exact }
    const [, head = '', double, single] = WITH_DEFAULT.exec(expression) ?? []
    const defaulted = liquid.get(liquidKey(head))
    const fallback = double ?? single
    return defaulted && { variable: defaulted, ...(fallback && { fallback }) }
  }

  return { pattern, read }
}
