import { isEmailHref } from '../schema/emailAttrs'
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

/** A link variable's place as an href, or nothing where it can't link. */
export type LinkTag = (key: string) => string | undefined

/** What goes in a placeholder's place in the HTML and in the plain text. */
export type Filled = { html: string; text: string }

// Private-use characters, which escapeHtml strips from what an author typed.
const PLACEHOLDER = /\uE000(\d+)\uE001/g

// A zero-width space splits text that reads as a token, so no sender fills it.
export const untokenedText = (text: string) =>
  text
    .replace(/\{(?=[{%])/g, '{\u200B')
    .replace(/([%}])(?=\})/g, '$1\u200B')
    .replace(/#(?=\w+#)/g, '#\u200B')
    .replace(/\[(?=\w+\])/g, '[\u200B')

// Typed token characters beside a variable would otherwise join its token. A
// preview's value isn't a token, so any syntax could read one across it.
const BESIDE_TAG: Record<EmailSyntax | 'preview', [RegExp, RegExp]> = {
  ae: [/#\w*(?=\uE000)/g, /\uE001(?=#)/g],
  liquid: [/\{(?=\uE000)/g, /\uE001(?=\})/g],
  preview: [/[#{[]\w*(?=\uE000)/g, /\uE001(?=[#}\]])/g]
}

const apartFromTags = (text: string, [before, after]: [RegExp, RegExp]) =>
  text.replace(before, '$&\u200B').replace(after, '$&\u200B')

// Liquid strings have no escapes, so the quote is one the text doesn't hold.
const liquidString = (text: string) =>
  text.includes('"') ? `'${text.replaceAll("'", '’')}'` : `"${text}"`

// One `{{ … }}` output, so a default never lands on the last of several.
const SINGLE_OUTPUT = /^\{\{(-?)((?:(?!\{\{|\}\})[\s\S])*?)(-?)\}\}$/

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
  const output = syntax === 'liquid' && SINGLE_OUTPUT.exec(token)
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
 * in `syntax`, or as its value from `values` for a preview. `hold` keeps
 * anything else MJML and html-to-text mustn't read, such as a condition.
 */
export function mergeTags({ syntax, variables = [], values }: MergeTagOptions) {
  const filled: Filled[] = []
  const hold = (held: Filled) => {
    filled.push(held)
    return `\uE000${filled.length - 1}\uE001`
  }
  const listed = (key: unknown) => {
    const variable = variables.find((each) => each.key === key)
    if (!variable) {
      throw new RangeError(`No variable has the key "${String(key)}".`)
    }
    return variable
  }
  const tag: MergeTag = ({ key, fallback }) => {
    const variable = listed(key)
    const shownFallback = typeof fallback === 'string' ? fallback : ''
    const value =
      values && Object.hasOwn(values, variable.key)
        ? values[variable.key]
        : undefined
    const preview = value || shownFallback
    return hold(
      values
        ? { html: escapeHtml(preview), text: untokenedText(preview) }
        : tokenFor(variable, shownFallback, syntax)
    )
  }
  // A whole URL in the plain text's brackets never joins a token.
  const hrefs = new Set<number>()
  const holdHref = (held: Filled) => {
    hrefs.add(filled.length)
    return hold(held)
  }
  const linkTag: LinkTag = (key) => {
    const variable = listed(key)
    if (variable.kind !== 'url') return undefined
    if (!values) return holdHref(tokenFor(variable, '', syntax))
    const value = Object.hasOwn(values, key) ? values[key] : undefined
    return isEmailHref(value)
      ? holdHref({ html: escapeHtml(value), text: value })
      : undefined
  }
  const besideTag = BESIDE_TAG[values || !syntax ? 'preview' : syntax]
  const filledIn =
    (part: keyof Filled, only?: Set<number>) =>
    (match: string, index: string) =>
      !only || only.has(Number(index)) ? filled[Number(index)]![part] : match
  const fill = (output: string, part: keyof Filled) =>
    part === 'text'
      ? apartFromTags(
          output.replace(PLACEHOLDER, filledIn(part, hrefs)),
          besideTag
        ).replace(PLACEHOLDER, filledIn(part))
      : output.replace(PLACEHOLDER, filledIn(part))
  return { tag, linkTag, hold, fill }
}
