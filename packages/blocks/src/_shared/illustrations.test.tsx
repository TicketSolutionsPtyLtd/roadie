import { render, screen, waitFor } from '@testing-library/react'
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as spot from '@oztix/roadie-illustrations/spot'
import { SPOT_ILLUSTRATIONS as CATALOGUE } from '@oztix/roadie-illustrations/spot/catalogue'

import type { SpotIllustrationName as ProvidedName } from '../Provider'
import {
  SpotIllustrationByName,
  type SpotIllustrationName,
  isSpotIllustration
} from './illustrations'

const SRC = join(import.meta.dirname, '..')

async function drawingOf(ui: React.ReactElement) {
  const { container } = render(<div data-testid='host'>{ui}</div>)
  await waitFor(() => expect(container.querySelector('path')).not.toBeNull())
  return screen.getByTestId('host').innerHTML
}

const markupOf = (Drawing: (typeof spot)['Heart']) =>
  render(<Drawing outline />).container.innerHTML

describe('isSpotIllustration', () => {
  it('knows every catalogued spot illustration, and nothing else', () => {
    for (const { name } of CATALOGUE)
      expect(isSpotIllustration(name)).toBe(true)
    for (const name of [
      'SpotIllustration',
      'constructor',
      '__proto__',
      'ticket',
      '',
      7,
      null
    ])
      expect(isSpotIllustration(name), String(name)).toBe(false)
  })

  it('takes the name a CMS stores, as before', () => {
    expectTypeOf<SpotIllustrationName>().toEqualTypeOf<
      Exclude<keyof typeof spot, 'SpotIllustration'>
    >()
    expectTypeOf<ProvidedName>().toEqualTypeOf<SpotIllustrationName>()
  })
})

describe('SpotIllustrationByName', () => {
  it.each(['Ticket', 'Number7', 'LetterB', 'Ampersand'] as const)(
    'draws %s by name',
    async (name) => {
      expect(
        await drawingOf(<SpotIllustrationByName name={name} outline />)
      ).toBe(markupOf(spot[name]))
    }
  )

  it.each([
    'SpotIllustration',
    'constructor',
    '__proto__',
    'ticket',
    '',
    7,
    null,
    undefined
  ])('falls back for %s, which names no illustration', async (name) => {
    const { container } = render(<SpotIllustrationByName name={name} />)
    expect(container).toBeEmptyDOMElement()
    expect(
      await drawingOf(
        <SpotIllustrationByName name={name} fallback='Heart' outline />
      )
    ).toBe(markupOf(spot.Heart))
  })
})

describe('the blocks', () => {
  // Named imports keep only what they name; the size table checks what ships.
  it('never import the whole spot illustration set', () => {
    const shipped = globSync('**/*.{ts,tsx}', { cwd: SRC }).filter(
      (file) => !/\.test\.tsx?$|fixtures\.tsx?$|^_test\//.test(file)
    )
    const barrel = /import \* as \w+ from '@oztix\/roadie-illustrations\/spot'/
    expect(
      shipped.filter((file) =>
        barrel.test(readFileSync(join(SRC, file), 'utf8'))
      )
    ).toEqual([])
  })
})
