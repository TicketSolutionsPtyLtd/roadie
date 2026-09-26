import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('dedupes Roadie semantic colour groups (last write wins)', () => {
    expect(cn('text-subtle', 'text-strong')).toBe('text-strong')
    expect(cn('text-inverted', 'text-on-strong')).toBe('text-on-strong')
    expect(cn('text-on-strong', 'text-normal')).toBe('text-normal')
    expect(cn('bg-normal', 'bg-raised')).toBe('bg-raised')
    expect(cn('border-subtle', 'border-strong')).toBe('border-strong')
  })

  it('dedupes intent and emphasis presets', () => {
    expect(cn('intent-neutral', 'intent-accent')).toBe('intent-accent')
    expect(cn('emphasis-subtle', 'emphasis-strong')).toBe('emphasis-strong')
  })

  it('dedupes emphasis-field against the other emphasis presets', () => {
    expect(cn('emphasis-field', 'emphasis-subtle')).toBe('emphasis-subtle')
    expect(cn('emphasis-sunken', 'emphasis-field')).toBe('emphasis-field')
  })

  it('merges every emphasis preset in emphasis.css', () => {
    const presets = readFileSync(
      fileURLToPath(new URL('../css/emphasis.css', import.meta.url)),
      'utf8'
    ).match(/(?<=@utility )emphasis-[\w-]+/g)

    expect(presets?.length).toBeGreaterThan(0)
    for (const preset of presets ?? []) {
      expect(cn(preset, 'emphasis-normal')).toBe('emphasis-normal')
    }
  })

  it('keeps interaction utilities alongside an emphasis preset', () => {
    expect(cn('emphasis-field', 'is-interactive-field')).toBe(
      'emphasis-field is-interactive-field'
    )
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

  it('dedupes Roadie loading animations against built-in ones', () => {
    expect(cn('animate-pulse-subtle', 'animate-none')).toBe('animate-none')
    expect(cn('animate-shimmer', 'animate-none')).toBe('animate-none')
    expect(cn('animate-indeterminate', 'animate-none')).toBe('animate-none')
    expect(cn('animate-pulse', 'animate-pulse-subtle')).toBe(
      'animate-pulse-subtle'
    )
    expect(cn('animate-pulse-subtle', 'animate-shimmer')).toBe(
      'animate-shimmer'
    )
  })

  it('dedupes Roadie named z-index tiers', () => {
    expect(cn('z-overlay', 'z-modal')).toBe('z-modal')
    expect(cn('z-popover', 'z-tooltip')).toBe('z-tooltip')
  })

  it('dedupes a Roadie named z-index against a numeric z-index', () => {
    expect(cn('z-overlay', 'z-80')).toBe('z-80')
    expect(cn('z-40', 'z-tooltip')).toBe('z-tooltip')
  })

  it('keeps unrelated classes intact', () => {
    expect(cn('p-4', 'duration-slow', 'rounded-full')).toBe(
      'p-4 duration-slow rounded-full'
    )
  })
})
