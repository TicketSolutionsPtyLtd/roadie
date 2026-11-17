import { describe, expect, it } from 'vitest'

import * as spot from '@oztix/roadie-illustrations/spot'
import { SPOT_ILLUSTRATIONS as CATALOGUE } from '@oztix/roadie-illustrations/spot/catalogue'

import { SPOT_ILLUSTRATIONS, spotIllustration } from './illustrations'

const catalogued = CATALOGUE.map(({ name }) => name)

describe('spotIllustration', () => {
  it('offers every catalogued spot illustration, and nothing else', () => {
    expect(Object.keys(SPOT_ILLUSTRATIONS).sort()).toEqual(catalogued.sort())
  })

  it.each(['Ticket', 'Number7', 'LetterB', 'Ampersand'])(
    'draws %s by name',
    (name) => {
      expect(spotIllustration(name)).toBe(spot[name as keyof typeof spot])
    }
  )

  it.each([
    'SpotIllustration',
    'constructor',
    '__proto__',
    'toString',
    'ticket',
    '',
    7,
    null,
    undefined
  ])('falls back for %s, which names no illustration', (name) => {
    expect(spotIllustration(name)).toBeUndefined()
    expect(spotIllustration(name, 'Heart')).toBe(spot.Heart)
  })
})
