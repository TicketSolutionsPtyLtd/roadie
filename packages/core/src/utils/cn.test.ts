import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('dedupes Roadie semantic colour groups (last write wins)', () => {
    expect(cn('text-subtle', 'text-strong')).toBe('text-strong')
    expect(cn('bg-normal', 'bg-raised')).toBe('bg-raised')
    expect(cn('border-subtle', 'border-strong')).toBe('border-strong')
  })

  it('dedupes intent and emphasis presets', () => {
    expect(cn('intent-neutral', 'intent-accent')).toBe('intent-accent')
    expect(cn('emphasis-subtle', 'emphasis-strong')).toBe('emphasis-strong')
  })

  it('dedupes Roadie named duration tokens', () => {
    expect(cn('duration-fast', 'duration-slow')).toBe('duration-slow')
    expect(cn('duration-moderate', 'duration-normal')).toBe('duration-normal')
  })

  it('dedupes a Roadie named duration against a numeric duration', () => {
    expect(cn('duration-slow', 'duration-150')).toBe('duration-150')
    expect(cn('duration-300', 'duration-fast')).toBe('duration-fast')
  })

  it('dedupes Roadie named easing tokens', () => {
    expect(cn('ease-standard', 'ease-enter')).toBe('ease-enter')
    expect(cn('ease-enter', 'ease-spring')).toBe('ease-spring')
  })

  it('dedupes a Roadie named easing against a built-in easing', () => {
    expect(cn('ease-enter', 'ease-out')).toBe('ease-out')
    expect(cn('ease-in', 'ease-spring')).toBe('ease-spring')
  })

  it('keeps unrelated classes intact', () => {
    expect(cn('p-4', 'duration-slow', 'rounded-full')).toBe(
      'p-4 duration-slow rounded-full'
    )
  })
})
