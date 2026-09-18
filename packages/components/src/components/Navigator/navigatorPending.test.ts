import { describe, expect, it } from 'vitest'

import sheet from '../../css/navigator-pending.css?raw'
import { navigatorRootClass } from './variants'

const media = (query: string) =>
  sheet.split('@media').find((chunk) => chunk.startsWith(` ${query}`)) ?? ''

describe('the pending indicator sheet', () => {
  it('has the frame isolate the layer it paints into', () => {
    expect(sheet).toContain('z-index: var(--z-index-hide)')
    expect(navigatorRootClass.split(' ')).toContain('isolate')
  })

  it('pins no colour step to one mode', () => {
    expect(sheet).not.toMatch(/--color-[\w-]+-light-\d/)
  })

  it('leaves the frame with no scrollport for the pull-back to shift', () => {
    const classes = navigatorRootClass.split(' ')
    expect(classes).toContain('overflow-clip')
    expect(classes).not.toContain('overflow-hidden')
  })

  it('keeps the colour and drops every movement under reduced motion', () => {
    const reduced = media('(prefers-reduced-motion: reduce)')
    expect(reduced).toContain('animation: none')
    expect(reduced).toContain('rotate: 0.125turn')
    expect(reduced).toContain('scale: none')
    expect(reduced).not.toContain('opacity: 0')
  })

  it('pulls the phone row back under md and nowhere else', () => {
    const phone = media('(width < 48rem)')
    expect(phone).toContain('scale: 0.96')
    expect(phone).toContain('--pane-radius-phone: var(--radius-2xl)')
    expect(sheet.replace(phone, '')).not.toContain('scale: 0.96')
  })

  it('resets the phone radius for a nested frame after setting it', () => {
    const phone = media('(width < 48rem)')
    expect(phone.indexOf('--pane-radius-phone: 0px')).toBeGreaterThan(
      phone.indexOf('--pane-radius-phone: var(--radius-2xl)')
    )
  })
})
