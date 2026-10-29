import { convert } from 'html-to-text'
import mjml2html from 'mjml'

import {
  type EditorValue,
  type StoredEditorValue,
  migrate
} from '../schema/value'
import { mjmlTree } from './mjmlTree'
import { type EmailTheme, emailTheme } from './theme'

export type RenderEmailOptions = {
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
 */
export async function renderEmail(
  value: StoredEditorValue | EditorValue,
  { theme }: RenderEmailOptions = {}
): Promise<RenderedEmail> {
  const { doc } = migrate(value, 'email')
  // Strict, since a tree MJML refuses is Roadie's bug, never the author's.
  const { html } = await mjml2html(mjmlTree(doc, emailTheme(theme)), {
    validationLevel: 'strict',
    fonts: {},
    keepComments: false
  })
  return { html, text: plainText(html) }
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
