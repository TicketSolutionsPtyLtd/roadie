import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

const ALIASES = [
  ['brand-blue', 'brand'],
  ['brand-purple', 'info'],
  ['brand-orange', 'brand-secondary']
] as const

const STEPS = [
  ...Array.from({ length: 14 }, (_, step) => `${step}`),
  'light-5',
  'light-9',
  'light-12',
  'light-13'
]

function resolved(el: Element, prop: string) {
  const probe = document.createElement('span')
  probe.style.color = `var(${prop})`
  el.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

function expectAliasesMatch(el: Element) {
  for (const [hue, scale] of ALIASES) {
    for (const step of STEPS) {
      const alias = `--color-${hue}-${step}`
      expect(getComputedStyle(el).getPropertyValue(alias), alias).not.toBe('')
      expect(resolved(el, alias), alias).toBe(
        resolved(el, `--color-${scale}-${step}`)
      )
    }
  }
}

describe('brand hue aliases', () => {
  it('match their scale in light mode', () => {
    const { container } = render(<div />)
    expectAliasesMatch(container.firstElementChild!)
  })

  it('match their scale with .dark on the root', () => {
    document.documentElement.classList.add('dark')
    const { container } = render(<div />)
    expectAliasesMatch(container.firstElementChild!)
  })

  it('match their scale in a nested .dark section', () => {
    const { container } = render(
      <div>
        <div data-testid='light' />
        <div className='dark'>
          <div data-testid='dark' />
        </div>
      </div>
    )
    const light = container.querySelector('[data-testid=light]')!
    const dark = container.querySelector('[data-testid=dark]')!
    expectAliasesMatch(dark)
    expect(resolved(dark, '--color-brand-blue-1')).not.toBe(
      resolved(light, '--color-brand-blue-1')
    )
  })
})
