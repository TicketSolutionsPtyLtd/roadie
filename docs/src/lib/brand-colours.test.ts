import { describe, expect, it } from 'vitest'

import { BRAND_HUES, brandColourTable, brandColours } from './brand-colours'
import { getFamilyTokens } from './tokens'

const tokens = await getFamilyTokens('color-scales')

describe('brandColours', () => {
  it.each([
    ['neutral', 'Flood', '--color-neutral-0', '#ffffff'],
    ['neutral', 'Blackout', '--color-neutral-12', '#16202a'],
    ['blue', 'House blue', '--color-brand-blue-5', '#c2dffb'],
    ['blue', 'Stage blue', '--color-brand-blue-7', '#92c1ee'],
    ['purple', 'Spotlight purple', '--color-brand-purple-9', '#a96af1'],
    ['orange', 'Wash orange', '--color-brand-orange-2', '#fef2ee'],
    ['yellow', 'Spotlight yellow', '--color-warning-9', '#e0ac00']
  ] as const)('%s %s is %s, %s in light mode', (hue, name, token, hex) => {
    expect(brandColours(tokens, hue)).toContainEqual(
      expect.objectContaining({ name, token, hex })
    )
  })

  it('names the brand hues by their aliases, never the scale tokens', () => {
    for (const hue of ['blue', 'purple', 'orange'] as const)
      for (const { token } of brandColours(tokens, hue))
        expect(token).toMatch(new RegExp(`^--color-brand-${hue}-\\d+$`))
  })

  it('gives Flood to neutral only', () => {
    expect(brandColours(tokens, 'neutral')).toHaveLength(7)
    expect(brandColours(tokens, 'red').map(({ name }) => name)).toEqual([
      'Wash red',
      'House red',
      'Stage red',
      'Spotlight red',
      'Backstage red',
      'Blackout red'
    ])
  })

  it.each([
    ['blue', '--color-brand-blue-9', '85, 25, 0, 0', false],
    ['neutral', '--color-neutral-0', '0, 0, 0, 0', false],
    ['blue', '--color-brand-blue-11', '100, 76, 25, 9', true],
    ['neutral', '--color-neutral-5', '14, 7, 3, 0', true],
    ['yellow', '--color-warning-9', '13, 33, 100, 0', true]
  ] as const)(
    'prints %s %s as CMYK "%s", derived %s',
    (hue, token, cmyk, derived) => {
      expect(
        brandColours(tokens, hue).find((colour) => colour.token === token)
      ).toMatchObject({ cmyk, derived })
    }
  )

  it('has a print value for every swatch', () => {
    for (const hue of Object.keys(BRAND_HUES) as (keyof typeof BRAND_HUES)[])
      for (const { token, cmyk } of brandColours(tokens, hue))
        expect(cmyk, token).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}, \d{1,3}$/)
  })

  it('marks derived print values in the markdown copy', () => {
    const cmyk = brandColourTable(tokens, 'neutral').rows.map((row) => row[3])
    expect(cmyk).toContainEqual([{ code: '0, 0, 0, 0' }])
    expect(cmyk).toContainEqual([{ code: '14, 7, 3, 0 (derived)' }])
  })
})
