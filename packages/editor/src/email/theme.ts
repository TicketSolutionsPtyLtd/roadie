import { DEFAULT_ACCENT_COLOR } from '@oztix/roadie-core/theme'

/**
 * The colours and font an email renders in. Mail clients don't read CSS
 * variables, so each colour is a hex value, written into the HTML.
 */
export type EmailTheme = {
  /** The email's background, behind every block. */
  background: string
  text: string
  /** The brand's colour, which links and strong buttons take unless set. */
  accent: string
  /** Links in text. The accent by default. */
  link: string
  /** A strong button's fill. The accent by default. */
  button: string
  /** A strong button's label. */
  buttonText: string
  /** A normal button's border. */
  border: string
  /** A subtle button's fill. */
  tint: string
  /** A divider's line. */
  divider: string
  /** A font stack of web-safe fonts, since most clients load no others. */
  fontFamily: string
}

/** Roadie's light scales as hex: an Oztix blue accent on white. */
export const defaultEmailTheme: Readonly<EmailTheme> = {
  background: '#ffffff', // neutral-light-0
  text: '#16202a', // neutral-light-12
  accent: DEFAULT_ACCENT_COLOR, // brand-light-9
  link: DEFAULT_ACCENT_COLOR,
  button: DEFAULT_ACCENT_COLOR,
  buttonText: '#ffffff', // neutral-light-0
  border: '#c1d1e1', // neutral-7
  tint: '#eaf1f7', // neutral-3
  divider: '#d7e2ed', // neutral-light-5
  fontFamily: 'Helvetica, Arial, sans-serif'
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
// MJML writes these into style attributes unescaped, so no `"`, `;` or `<`.
const FONT_FAMILY = /^[\w\s,'-]+$/

/**
 * The theme's keys over the default, checked. Throws a TypeError on a colour
 * that isn't a hex value, or a font stack with more than names, quotes and
 * commas.
 */
export function emailTheme(theme: Partial<EmailTheme> = {}): EmailTheme {
  const resolved = { ...defaultEmailTheme }
  for (const key of Object.keys(defaultEmailTheme) as (keyof EmailTheme)[]) {
    const value: unknown = theme[key]
    if (value === undefined) continue
    const font = key === 'fontFamily'
    if (
      typeof value !== 'string' ||
      !(font ? FONT_FAMILY : HEX_COLOR).test(value)
    ) {
      throw new TypeError(
        `An email theme's ${key} must be ${font ? 'a font stack' : 'a hex colour'}; got ${JSON.stringify(value)}.`
      )
    }
    resolved[key] = value
  }
  return {
    ...resolved,
    link: theme.link === undefined ? resolved.accent : resolved.link,
    button: theme.button === undefined ? resolved.accent : resolved.button
  }
}
