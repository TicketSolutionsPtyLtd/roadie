import { describe, expect, it } from 'vitest'

import { emailCanvasStyle } from './emailCanvas'

describe('emailCanvasStyle', () => {
  it('sets only the colours the theme gives', () => {
    expect(
      emailCanvasStyle({ background: '#fdf6e3', buttonText: '#000' })
    ).toEqual({
      '--email-theme-background': '#fdf6e3',
      '--email-theme-button-text': '#000'
    })
  })

  it('leaves the canvas to its fallbacks without a theme', () => {
    expect(emailCanvasStyle(undefined)).toBeUndefined()
  })

  it('throws on a colour renderEmail would refuse', () => {
    expect(() => emailCanvasStyle({ text: 'red; background: url(x)' })).toThrow(
      TypeError
    )
  })
})
