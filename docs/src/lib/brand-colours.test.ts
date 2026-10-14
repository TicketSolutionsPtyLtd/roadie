import { describe, expect, it } from 'vitest'

import { brandColours } from './brand-colours'
import { getFamilyTokens } from './tokens'

const tokens = await getFamilyTokens('color-scales')

describe('brandColours', () => {
  it.each([
    ['neutral', 'Flood', '--color-neutral-0', '#ffffff'],
    ['neutral', 'Blackout', '--color-neutral-12', '#16202a'],
    ['blue', 'House blue', '--color-brand-5', '#c2dffb'],
    ['blue', 'Stage blue', '--color-brand-7', '#92c1ee'],
    ['purple', 'Spotlight purple', '--color-info-9', '#a96af1'],
    ['orange', 'Wash orange', '--color-brand-secondary-2', '#fef2ee'],
    ['yellow', 'Spotlight yellow', '--color-warning-9', '#e0ac00']
  ] as const)('%s %s is %s, %s in light mode', (hue, name, token, hex) => {
    expect(brandColours(tokens, hue)).toContainEqual(
      expect.objectContaining({ name, token, hex })
    )
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
    ['blue', '--color-brand-9', '85, 25, 0, 0'],
    ['blue', '--color-brand-11', ''],
    ['neutral', '--color-neutral-5', ''],
    ['yellow', '--color-warning-9', '']
  ] as const)(
    'prints %s %s as CMYK "%s", blank where the value changed',
    (hue, token, cmyk) => {
      expect(
        brandColours(tokens, hue).find((colour) => colour.token === token)?.cmyk
      ).toBe(cmyk)
    }
  )
})
