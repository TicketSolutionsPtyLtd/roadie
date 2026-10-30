import { convert } from 'html-to-text'
import mjml2html from 'mjml'

import type { StoredEmailContent } from '../schema/emailContent'
import { migrate } from '../schema/value'
import { conditions } from './conditions'
import { type MergeTagOptions, mergeTags, untokenedText } from './mergeTags'
import { mjmlTree } from './mjmlTree'
import { type EmailTheme, emailTheme } from './theme'

export type RenderEmailOptions = MergeTagOptions & {
  /** An app's brand kit, over `defaultEmailTheme`. HTML ignores it. */
  theme?: Partial<EmailTheme>
}

export type RenderedEmail = {
  /** A whole HTML page, table-based and inline-styled for mail clients. */
  html: string
  /** The plain-text part, from the same content. */
  text: string
}

/**
 * Renders a saved email. A design is read into the email preset first; HTML
 * is sent as written, with a plain-text part. Runs on the server only: MJML
 * needs Node.
 *
 * In a design, each variable is written as its token in `syntax`, from
 * `variables`, for the sending system to fill, or with `values` as its value
 * for a preview. Throws on a variable `variables` doesn't list, or one with
 * no token in `syntax`. HTML's merge tags are already tokens, so it ignores
 * these options.
 *
 * A block with a `showWhen` rule is wrapped in a Liquid `if` with
 * `syntax: 'liquid'`, or shown only when its rule holds with `values`.
 * Throws on a rule in the `ae` syntax, which has no conditions, on a rule
 * naming a variable `variables` doesn't list or whose Liquid token isn't a
 * plain variable, and on a value a Liquid string can't hold.
 */
export async function renderEmail(
  content: StoredEmailContent,
  { theme, ...options }: RenderEmailOptions = {}
): Promise<RenderedEmail> {
  if (content?.kind === 'html') {
    if (typeof content.html !== 'string') {
      throw new TypeError('An HTML email needs its html as a string.')
    }
    return { html: content.html, text: plainText(content.html) }
  }
  if (content?.kind !== 'design') {
    throw new TypeError(
      `Unknown email kind ${JSON.stringify((content as { kind?: unknown })?.kind)}; expected 'design' or 'html'.`
    )
  }
  const { doc } = migrate(content.value, 'email')
  const { tag, hold, fill } = mergeTags(options)
  const tree = mjmlTree(doc, {
    theme: emailTheme(theme),
    tag,
    showsWhen: conditions(options, hold)
  })
  // Strict, since a tree MJML refuses is Roadie's bug, never the author's.
  const { html } = await mjml2html(tree, {
    validationLevel: 'strict',
    fonts: {},
    keepComments: false
  })
  return {
    html: fill(html, 'html'),
    text: fill(untokenedText(plainText(html)), 'text')
  }
}

// A spacer's hair space would otherwise leave lines of whitespace.
function plainText(html: string) {
  return convert(html, {
    wordwrap: 78,
    selectors: [
      { selector: 'img', format: 'skip' },
      // A layout table's cells are columns, not words of one line.
      { selector: 'td', format: 'paragraph' },
      { selector: 'th', format: 'paragraph' },
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } }
    ]
  })
    .replace(/[^\S\n]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}
