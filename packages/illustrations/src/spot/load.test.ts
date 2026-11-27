// @vitest-environment node
import { describe, expect, expectTypeOf, it } from 'vitest'

import { SPOT_ILLUSTRATIONS } from './catalogue'
import * as spot from './index'
import * as onDemand from './load'
import * as onServer from './load.node'

const names = SPOT_ILLUSTRATIONS.map(
  ({ name }) => name as onDemand.SpotIllustrationName
)

describe.each([
  ['in a browser, on demand', onDemand],
  ['on a server, from the set', onServer]
])('loading a spot illustration by name %s', (_, load) => {
  it('knows every catalogued name, and nothing else', () => {
    for (const name of names)
      expect(load.isSpotIllustrationName(name)).toBe(true)
    for (const name of [
      'SpotIllustration',
      'constructor',
      '__proto__',
      'toString',
      'ticket',
      '',
      7,
      null,
      undefined
    ])
      expect(load.isSpotIllustrationName(name), String(name)).toBe(false)
  })

  it('resolves every name to the component the set exports', async () => {
    for (const name of names)
      expect(await load.loadSpotIllustration(name), name).toBe(spot[name])
  })

  it('hands back a loaded illustration without waiting', async () => {
    await load.loadSpotIllustration('Ticket')
    expect(load.loadedSpotIllustration('Ticket')).toBe(spot.Ticket)
  })
})

describe('loading on demand', () => {
  it('loads each illustration once', () => {
    expect(onDemand.loadSpotIllustration('Heart')).toBe(
      onDemand.loadSpotIllustration('Heart')
    )
  })

  it('names exactly the components the set exports', () => {
    expectTypeOf<onDemand.SpotIllustrationName>().toEqualTypeOf<
      Exclude<keyof typeof spot, 'SpotIllustration'>
    >()
  })
})
