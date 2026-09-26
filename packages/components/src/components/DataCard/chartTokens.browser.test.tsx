import type React from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function resolved(el: Element, prop: string) {
  const probe = document.createElement('span')
  probe.style.color = `var(${prop})`
  el.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

describe('chart ink in nested sections', () => {
  it('follows a nested dark intent section', () => {
    const { container } = render(
      <div>
        <div data-testid='light' />
        <div className='dark intent-neutral' data-testid='dark' />
      </div>
    )
    const light = container.querySelector('[data-testid=light]')!
    const dark = container.querySelector('[data-testid=dark]')!
    for (const token of ['--chart-label', '--chart-value', '--chart-grid']) {
      expect(resolved(dark, token)).not.toBe(resolved(light, token))
    }
    expect(resolved(dark, '--chart-value')).toBe(
      resolved(dark, '--intent-text-strong')
    )
  })
})

describe('chart highlight in nested sections', () => {
  it('follows an inline accent hue', () => {
    const { container } = render(
      <div>
        <div data-testid='root' />
        <div style={{ '--accent-hue': '20' } as React.CSSProperties}>
          <div data-testid='warm' />
        </div>
      </div>
    )
    const root = container.querySelector('[data-testid=root]')!
    const warm = container.querySelector('[data-testid=warm]')!
    expect(resolved(warm, '--chart-highlight')).not.toBe(
      resolved(root, '--chart-highlight')
    )
  })

  it('follows a nested dark section with no intent class', () => {
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
    expect(resolved(dark, '--chart-highlight')).not.toBe(
      resolved(light, '--chart-highlight')
    )
  })

  it('keeps the dark highlight inside an intent section within dark', () => {
    const { container } = render(
      <div className='dark'>
        <div data-testid='dark' />
        <div className='intent-danger'>
          <div data-testid='nested' />
        </div>
      </div>
    )
    const dark = container.querySelector('[data-testid=dark]')!
    const nested = container.querySelector('[data-testid=nested]')!
    expect(resolved(nested, '--chart-highlight')).toBe(
      resolved(dark, '--chart-highlight')
    )
  })
})
