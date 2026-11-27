import { describe, expect, it } from 'vitest'

import { mergeClassName } from './mergeClassName'

describe('mergeClassName', () => {
  it('merges a string with tailwind-merge', () => {
    expect(mergeClassName('p-2 text-sm', 'p-4')).toBe('text-sm p-4')
  })

  it('takes a list of base classes, as cn does', () => {
    expect(mergeClassName(['p-2', false, 'text-sm'], 'p-4')).toBe('text-sm p-4')
    expect(mergeClassName(['p-2', 'text-sm'], undefined)).toBe('p-2 text-sm')
  })

  it('keeps a state callback a callback', () => {
    const merged = mergeClassName<{ open: boolean }>(['p-2', 'grid'], (state) =>
      state.open ? 'p-4' : undefined
    )
    expect(typeof merged).toBe('function')
    const resolve = merged as (state: { open: boolean }) => string
    expect(resolve({ open: true })).toBe('grid p-4')
    expect(resolve({ open: false })).toBe('p-2 grid')
  })
})
