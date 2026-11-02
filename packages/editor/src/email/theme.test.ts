import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

import { defaultEmailTheme } from './index'
import { emailTheme } from './theme'

type Token = { name: string; value?: { fallback?: string } }

const { tokens } = createRequire(import.meta.url)(
  '@oztix/roadie-core/roadie.manifest.json'
) as { tokens: Token[] }

const hexOf = (token: string) =>
  tokens.find(({ name }) => name === `--color-${token}`)?.value?.fallback

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
    expect(hexOf(token)).toMatch(/^#[0-9a-f]{6}$/)
    expect(defaultEmailTheme[key]).toBe(hexOf(token))
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
