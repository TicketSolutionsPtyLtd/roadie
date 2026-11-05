import type { CSSProperties } from 'react'

import { type EmailTheme, defaultEmailTheme, emailTheme } from '../email/theme'

const CSS_NAMES: Record<keyof EmailTheme, string> = {
  background: '--email-theme-background',
  text: '--email-theme-text',
  accent: '--email-theme-accent',
  link: '--email-theme-link',
  button: '--email-theme-button',
  buttonText: '--email-theme-button-text',
  border: '--email-theme-border',
  tint: '--email-theme-tint',
  divider: '--email-theme-divider',
  fontFamily: '--email-theme-font-family'
}

// These follow a ThemeProvider's accent unless the theme sets them.
const ACCENTS = new Set<keyof EmailTheme>(['accent', 'link', 'button'])

/**
 * The theme's colours over the default email theme, as the variables
 * editor.css draws the email canvas with, so it shows what `renderEmail`
 * sends. The accent, link and button colours are set only when the theme
 * gives them; otherwise a `ThemeProvider`'s accent shows. Throws as
 * `renderEmail` does on a value that isn't a hex colour.
 */
export function emailCanvasStyle(
  theme: Partial<EmailTheme> = {}
): CSSProperties {
  const resolved = emailTheme(theme)
  const keys = (Object.keys(defaultEmailTheme) as (keyof EmailTheme)[]).filter(
    (key) => !ACCENTS.has(key) || theme[key] !== undefined
  )
  return Object.fromEntries(
    keys.map((key) => [CSS_NAMES[key], resolved[key]])
  ) as CSSProperties
}
