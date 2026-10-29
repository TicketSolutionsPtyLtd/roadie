import { convert } from 'html-to-text'
import mjml2html from 'mjml'

import type { StoredEmailContent } from '../schema/emailContent'
import { migrate } from '../schema/value'
import { mjmlTree } from './mjmlTree'
import { type EmailTheme, emailTheme } from './theme'

export type RenderEmailOptions = {
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
 */
export async function renderEmail(
  content: StoredEmailContent,
  { theme }: RenderEmailOptions = {}
): Promise<RenderedEmail> {
  if (content?.kind === 'html') {
    return { html: content.html, text: plainText(content.html) }
  }
  if (content?.kind !== 'design') {
    throw new TypeError(
      `Unknown email kind ${JSON.stringify((content as { kind?: unknown })?.kind)}; expected 'design' or 'html'.`
    )
  }
  const { doc } = migrate(content.value, 'email')
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
