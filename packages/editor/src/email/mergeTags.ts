import type { EditorVariable } from '../schema/variables'
import { escapeHtml } from './textHtml'

/** The sending system's merge tag syntax: `#Token#`, or Liquid's `{{ }}`. */
export type EmailSyntax = 'ae' | 'liquid'

export type MergeTagOptions = {
  syntax?: EmailSyntax
  variables?: readonly EditorVariable[]
  values?: Readonly<Record<string, string>>
}

/** Writes a variable node's place in the email, filled once MJML is done. */
export type MergeTag = (attrs: Record<string, unknown>) => string

type Filled = { html: string; text: string }

// Private-use characters, which escapeHtml strips from what an author typed.
const PLACEHOLDER = /\uE000(\d+)\uE001/g

// A zero-width space splits text that reads as a token, so no sender fills it.
export const untokenedText = (text: string) =>
  text
    .replace(/\{(?=[{%])/g, '{\u200B')
    .replace(/([%}])(?=\})/g, '$1\u200B')
    .replace(/#(?=\w+#)/g, '#\u200B')
    .replace(/\[(?=\w+\])/g, '[\u200B')

// Liquid strings have no escapes, so the quote is one the text doesn't hold.
const liquidString = (text: string) =>
  text.includes('"') ? `'${text.replaceAll("'", '’')}'` : `"${text}"`

function tokenFor(
  variable: EditorVariable,
  fallback: string,
  syntax: EmailSyntax | undefined
): Filled {
  if (!syntax) {
    throw new TypeError(
      'renderEmail needs a syntax to write merge tags, or values to fill them.'
    )
  }
  const token = variable.tokens[syntax]
  if (!token) {
    throw new RangeError(
      `The variable "${variable.key}" has no ${syntax} token.`
    )
  }
  // `{{-` and `-}}` trim whitespace, so they stay outside the default.
  const output =
    syntax === 'liquid' && /^\{\{(-?)([\s\S]*?)(-?)\}\}$/.exec(token)
  if (!output || !fallback) return { html: token, text: token }
  const [, open, filter, close] = output
  const withDefault = (quoted: string) =>
    `{{${open} ${filter!.trim()} | default: ${quoted} ${close}}}`
  return {
    html: withDefault(`"${escapeHtml(fallback)}"`),
    text: withDefault(liquidString(untokenedText(fallback)))
  }
}

/**
 * Collects each variable as the email is built, then writes it as its token
 * in `syntax`, or as its value from `values` for a preview.
 */
export function mergeTags({ syntax, variables = [], values }: MergeTagOptions) {
  const filled: Filled[] = []
  const tag: MergeTag = ({ key, fallback }) => {
    const variable = variables.find((listed) => listed.key === key)
    if (!variable) {
      throw new RangeError(`No variable has the key "${String(key)}".`)
    }
    const shownFallback = typeof fallback === 'string' ? fallback : ''
    const value =
      values && Object.hasOwn(values, variable.key)
        ? values[variable.key]
        : undefined
    const preview = value || shownFallback
    filled.push(
      values
        ? { html: escapeHtml(preview), text: untokenedText(preview) }
        : tokenFor(variable, shownFallback, syntax)
    )
    return `\uE000${filled.length - 1}\uE001`
  }
  const fill = (output: string, part: keyof Filled) =>
    output.replace(PLACEHOLDER, (_match, index) => filled[Number(index)]![part])
  return { tag, fill }
}
