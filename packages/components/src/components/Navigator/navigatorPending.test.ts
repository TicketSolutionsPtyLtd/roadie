import { describe, expect, it } from 'vitest'

import sheet from '../../css/navigator-pending.css?raw'

const media = (query: string) =>
  sheet.split('@media').find((chunk) => chunk.startsWith(` ${query}`)) ?? ''

describe('the pending indicator sheet', () => {
  it('mixes the three brand colours', () => {
    expect(sheet).toContain('--pending-1: var(--color-brand-9)')
    expect(sheet).toContain('--pending-2: var(--color-brand-secondary-5)')
    expect(sheet).toContain('--pending-3: var(--color-info-5)')
  })

  // The wash covers the frame, so each mode takes its own values. A `-light-`
  // step would pin the light ones into dark mode, where they glare.
  it('pins no step to one mode', () => {
    expect(sheet).not.toMatch(/--color-[\w-]+-light-\d/)
  })

  it('animates rotation alone, on the compositor', () => {
    expect(sheet).toContain('animation: navigator-pending-spin')
    expect(sheet).toMatch(
      /@keyframes navigator-pending-spin \{\s*to \{\s*rotate: 1turn/
    )
  })

  it('keeps the colour and drops the spin under reduced motion', () => {
    const reduced = media('(prefers-reduced-motion: reduce)')
    expect(reduced).toContain('animation: none')
    expect(reduced).toContain('rotate: 0.125turn')
    expect(reduced).not.toContain('opacity: 0')
  })

  it('pulls the phone row back only under md', () => {
    const phone = media('(width < 48rem)')
    expect(phone).toContain('scale: 0.96')
    expect(phone).toContain('--pane-radius-phone: var(--radius-2xl)')
  })
})
