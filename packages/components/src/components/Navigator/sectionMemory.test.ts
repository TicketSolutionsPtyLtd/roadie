import { describe, expect, it } from 'vitest'

import { activeHref, nextMemory, rememberedHref } from './sectionMemory'

describe('rememberedHref', () => {
  const memory = new Map([['/tokens', '/tokens/color']])

  it('retargets a section the user is not in', () => {
    expect(rememberedHref(memory, '/tokens', '/tokens', false)).toBe(
      '/tokens/color'
    )
  })

  it('leaves the section you are in on its declared href', () => {
    expect(rememberedHref(memory, '/tokens', '/tokens', true)).toBe('/tokens')
  })

  it('falls back to the declared href with no memory', () => {
    expect(rememberedHref(new Map(), '/tokens', '/tokens', false)).toBe(
      '/tokens'
    )
  })

  it('stays undefined when there is nothing declared and nothing remembered', () => {
    expect(
      rememberedHref(new Map(), '/tokens', undefined, false)
    ).toBeUndefined()
  })
})

describe('nextMemory', () => {
  it('returns the same map when nothing changed', () => {
    const memory = new Map([['/tokens', '/tokens/color']])
    expect(nextMemory(memory, '/tokens', '/tokens/color')).toBe(memory)
  })

  it('returns a new map when the value changed', () => {
    const memory: ReadonlyMap<string, string> = new Map([
      ['/tokens', '/tokens/color']
    ])
    const next = nextMemory(memory, '/tokens', '/tokens/spacing')
    expect(next).not.toBe(memory)
    expect(next.get('/tokens')).toBe('/tokens/spacing')
  })
})

describe('activeHref', () => {
  it('prefers a declared href', () => {
    expect(activeHref('/tokens/color', '/tokens/color-page')).toBe(
      '/tokens/color-page'
    )
  })

  it('falls back to a path-shaped value', () => {
    expect(activeHref('/tokens/color', undefined)).toBe('/tokens/color')
  })

  it('refuses a value that is not a path', () => {
    expect(activeHref('tokens-color', undefined)).toBeUndefined()
  })
})
