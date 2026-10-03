import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { DashboardPeriod } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'
const TIMEOUT = { timeout: 15_000 }

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const box = (element: Element) => element.getBoundingClientRect()
const middle = (rect: DOMRect) => rect.top + rect.height / 2

function renderAt(width: number) {
  render(
    <div style={{ width }}>
      <DashboardPeriod
        today={TODAY}
        value={{
          range: 'this-month',
          compare: { start: '2026-09-01', end: '2026-09-30' }
        }}
      >
        <button type='button'>Similar venues</button>
      </DashboardPeriod>
    </div>
  )
  const group = screen.getByRole('group', { name: 'Period' })
  const controls = [
    screen.getByRole('button', { name: /^Choose dates, Period/ }),
    screen.getByRole('combobox', { name: 'Compare with' }),
    screen.getByRole('button', { name: /^Choose dates, Comparison dates/ }),
    screen.getByRole('button', { name: 'Similar venues' })
  ]
  return { group, controls }
}

describe('DashboardPeriod layout', TIMEOUT, () => {
  it('stacks its controls full width on a phone', () => {
    const { group, controls } = renderAt(358)
    const [picker, comparison, custom] = controls.map(box)
    expect(picker!.width).toBeCloseTo(box(group).width, 0)
    expect(comparison!.width).toBeCloseTo(box(group).width, 0)
    expect(comparison!.top).toBeGreaterThanOrEqual(picker!.bottom)
    expect(custom!.top).toBeGreaterThanOrEqual(comparison!.bottom)
  })

  it('sets its controls in a row, each as wide as its words, when there is room', () => {
    const { group, controls } = renderAt(1100)
    const [picker, comparison, custom, own] = controls.map(box)
    for (const control of [comparison!, custom!, own!])
      expect(middle(control)).toBeCloseTo(middle(picker!), 0)
    expect(picker!.width).toBeLessThan(box(group).width / 2)
    expect(comparison!.left).toBeGreaterThan(picker!.right)
  })
})
