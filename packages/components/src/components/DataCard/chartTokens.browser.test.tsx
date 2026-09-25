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
