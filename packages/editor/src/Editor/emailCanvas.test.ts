import { describe, expect, it } from 'vitest'

import { defaultEmailTheme } from '../email/theme'
import { emailCanvasStyle } from './emailCanvas'

describe('emailCanvasStyle', () => {
  it('sets the theme’s colours over the default email theme', () => {
    expect(
      emailCanvasStyle({ background: '#fdf6e3', buttonText: '#000' })
    ).toEqual({
      '--email-theme-background': '#fdf6e3',
      '--email-theme-text': defaultEmailTheme.text,
      '--email-theme-button-text': '#000',
      '--email-theme-border': defaultEmailTheme.border,
      '--email-theme-tint': defaultEmailTheme.tint,
      '--email-theme-divider': defaultEmailTheme.divider,
      '--email-theme-font-family': defaultEmailTheme.fontFamily
    })
  })

  it('leaves the accent to a ThemeProvider unless the theme sets it', () => {
    expect(emailCanvasStyle()).not.toHaveProperty('--email-theme-accent')
    expect(emailCanvasStyle({ link: '#004400' })).toMatchObject({
      '--email-theme-link': '#004400'
    })
  })

  it('throws on a colour renderEmail would refuse', () => {
    expect(() => emailCanvasStyle({ text: 'red; background: url(x)' })).toThrow(
      TypeError
    )
  })
})
