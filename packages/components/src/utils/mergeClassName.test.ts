import { describe, expect, it } from 'vitest'

import { mergeClassName } from './mergeClassName'

describe('mergeClassName', () => {
  it('merges a string with tailwind-merge', () => {
    expect(mergeClassName('p-2 text-sm', 'p-4')).toBe('text-sm p-4')
  })

  it('keeps a state callback a callback', () => {
    const merged = mergeClassName<{ open: boolean }>('p-2', (state) =>
      state.open ? 'p-4' : undefined
    )
    expect(typeof merged).toBe('function')
    const resolve = merged as (state: { open: boolean }) => string
    expect(resolve({ open: true })).toBe('p-4')
    expect(resolve({ open: false })).toBe('p-2')
  })
})
