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

  it('lets a bg utility override the floating surface fill', () => {
    expect(cn('surface-floating p-1', 'bg-raised')).toBe('p-1 bg-raised')
    expect(cn('bg-(--intent-bg-raised)', 'surface-floating')).toBe(
      'surface-floating'
    )
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

  it('merges every intent in intents.css', () => {
    const intents = readFileSync(
      fileURLToPath(new URL('../css/intents.css', import.meta.url)),
      'utf8'
    ).match(/(?<=@utility )intent-[\w-]+/g)

    expect(intents).toContain('intent-brand-purple')
    for (const intent of intents ?? []) {
      expect(cn(intent, 'intent-neutral')).toBe('intent-neutral')
      expect(cn('intent-neutral', intent)).toBe(intent)
    }
  })

  it('lets a consumer’s link emphasis replace a component’s', () => {
    const links = readFileSync(
      fileURLToPath(new URL('../css/links.css', import.meta.url)),
      'utf8'
    ).match(/(?<=@utility )link-[\w-]+/g)

    expect(links).toContain('link-subtle')
    for (const link of links ?? []) {
      expect(cn(link, 'link-normal')).toBe('link-normal')
      expect(cn('link-normal', link)).toBe(link)
    }
  })

  it('dedupes the selection states, which each set the label colour', () => {
    const states = readFileSync(
      fileURLToPath(new URL('../css/emphasis.css', import.meta.url)),
      'utf8'
    ).match(/(?<=@utility )is-(?:un)?select[\w-]+/g)

    expect(states).toHaveLength(4)
    for (const state of states ?? []) {
      expect(cn(state, 'is-unselected')).toBe('is-unselected')
      expect(cn('emphasis-subtle', state)).toBe(`emphasis-subtle ${state}`)
    }
  })

  it('keeps interaction utilities alongside an emphasis preset', () => {
    expect(cn('emphasis-field', 'is-interactive-field')).toBe(
      'emphasis-field is-interactive-field'
    )
  })

  it('lets a consumer’s prose size replace a component’s', () => {
    expect(cn('prose prose-sm', 'prose-lg')).toBe('prose prose-lg')
    expect(cn('prose-lg', 'prose-sm')).toBe('prose-sm')
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

  it('merges every animate utility in motion.css', () => {
    const animations = readFileSync(
      fileURLToPath(new URL('../css/motion.css', import.meta.url)),
      'utf8'
    ).match(/(?<=@utility )animate-[\w-]+/g)

    expect(animations).toContain('animate-pop-tap')
    for (const animation of animations ?? []) {
      expect(cn(animation, 'animate-none')).toBe('animate-none')
      expect(cn('animate-spin', animation)).toBe(animation)
    }
  })

  it('merges every easing in motion.css', () => {
    const easings = readFileSync(
      fileURLToPath(new URL('../css/motion.css', import.meta.url)),
      'utf8'
    ).match(/(?<=--)ease-[\w-]+(?=:)/g)

    expect(easings).toContain('ease-spring-lively')
    for (const easing of new Set(easings)) {
      expect(cn(easing, 'ease-linear')).toBe('ease-linear')
      expect(cn('ease-in', easing)).toBe(easing)
    }
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

  it('dedupes every z-index tier layering.css defines', () => {
    const css = readFileSync(
      fileURLToPath(new URL('../css/layering.css', import.meta.url)),
      'utf8'
    )
    const tiers = [...css.matchAll(/--z-index-([a-z][a-z-]*):/g)].map(
      ([, tier]) => `z-${tier}`
    )
    expect(tiers).toContain('z-alert')
    for (const tier of tiers) expect(cn('z-base', tier)).toBe(tier)
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
