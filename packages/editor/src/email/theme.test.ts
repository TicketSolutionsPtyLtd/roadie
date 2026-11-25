import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

import { DEFAULT_ACCENT_HUE, toHex } from '@oztix/roadie-core/dataviz'

import { defaultEmailTheme } from './index'
import { emailTheme } from './theme'

type Token = { name: string; value?: { light?: string } }

const { tokens } = createRequire(import.meta.url)(
  '@oztix/roadie-core/roadie.manifest.json'
) as { tokens: Token[] }

// Each sRGB channel of the token, which Roadie writes in oklch().
const channelsOf = (token: string) => {
  const light = tokens.find(({ name }) => name === `--color-${token}`)?.value
    ?.light
  const [l, c, h] = (/^oklch\((.*)\)$/.exec(light ?? '')?.[1] ?? '')
    .replace('var(--accent-hue)', String(DEFAULT_ACCENT_HUE))
    .split(' ')
    .map(Number)
  return channels(toHex([l!, c!, h!]))
}
const channels = (hex: string) =>
  [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))

describe('defaultEmailTheme', () => {
  it.each([
    ['background', 'neutral-light-0'],
    ['text', 'neutral-light-12'],
    ['accent', 'brand-light-9'],
    ['link', 'brand-light-9'],
    ['button', 'brand-light-9'],
    ['buttonText', 'neutral-light-0'],
    ['border', 'neutral-7'],
    ['tint', 'neutral-3'],
    ['divider', 'neutral-light-5']
  ] as const)('takes its %s from Roadie’s --color-%s', (key, token) => {
    // Within a unit per channel: OKLCH rounds to three places.
    channels(defaultEmailTheme[key]).forEach((channel, i) =>
      expect(Math.abs(channel - channelsOf(token)[i]!)).toBeLessThanOrEqual(1)
    )
  })
})

describe('emailTheme', () => {
  it('gives links and strong buttons the accent', () => {
    expect(emailTheme({ accent: '#5f270f' })).toMatchObject({
      link: '#5f270f',
      button: '#5f270f'
    })
  })

  it('keeps a link or button colour set apart from the accent', () => {
    expect(
      emailTheme({ accent: '#5f270f', link: '#123456', button: '#abcdef' })
    ).toMatchObject({ accent: '#5f270f', link: '#123456', button: '#abcdef' })
  })
})
