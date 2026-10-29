import { convert } from 'html-to-text'
import mjml2html from 'mjml'

import {
  type EditorValue,
  type StoredEditorValue,
  migrate
} from '../schema/value'
import { type MergeTagOptions, mergeTags, untokenedText } from './mergeTags'
import { mjmlTree } from './mjmlTree'
import { type EmailTheme, emailTheme } from './theme'

export type RenderEmailOptions = MergeTagOptions & {
  /** An app's brand kit, over `defaultEmailTheme`. */
  theme?: Partial<EmailTheme>
}

export type RenderedEmail = {
  /** A whole HTML page, table-based and inline-styled for mail clients. */
  html: string
  /** The plain-text part, from the same content. */
  text: string
}

/**
 * Renders a saved value as an email, reading it into the email preset first.
 * Runs on the server only: MJML needs Node.
 *
 * Each variable is written as its token in `syntax`, from `variables`, for
 * the sending system to fill, or with `values` as its value for a preview.
 * Throws on a variable `variables` doesn't list, or one with no token in
 * `syntax`.
 */
export async function renderEmail(
  value: StoredEditorValue | EditorValue,
  { theme, ...options }: RenderEmailOptions = {}
): Promise<RenderedEmail> {
  const { doc } = migrate(value, 'email')
  const { tag, fill } = mergeTags(options)
  const tree = mjmlTree(doc, { theme: emailTheme(theme), tag })
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
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } }
    ]
  })
    .replace(/[^\S\n]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}
