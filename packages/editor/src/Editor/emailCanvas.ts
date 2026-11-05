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

/**
 * The theme's own colours as the variables editor.css draws the email
 * canvas with. A key the theme leaves out falls back in the CSS, to
 * Roadie's light scales, so the canvas follows a `ThemeProvider`'s accent.
 * Throws as `renderEmail` does on a value that isn't a hex colour.
 */
export function emailCanvasStyle(
  theme: Partial<EmailTheme> | undefined
): CSSProperties | undefined {
  if (!theme) return undefined
  const resolved = emailTheme(theme)
  const keys = (Object.keys(defaultEmailTheme) as (keyof EmailTheme)[]).filter(
    (key) => theme[key] !== undefined
  )
  return Object.fromEntries(
    keys.map((key) => [CSS_NAMES[key], resolved[key]])
  ) as CSSProperties
}
