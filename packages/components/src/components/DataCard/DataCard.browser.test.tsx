import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { DataCard } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const WIDTHS = [166, 240, 280, 343, 460]

function lines(root: HTMLElement) {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'h3, [data-slot=data-card-value], p.truncate'
    )
  ]
}

describe('DataCard copy never wraps', () => {
  for (const width of WIDTHS)
    it(`stays on one line at ${width}px`, () => {
      const { container } = render(
        <div style={{ width }}>
          <DataCard
            label='Gross revenue'
            value={118400}
            format='compactCurrency'
            delta={{ value: -0.04, format: 'percent' }}
            context='On last week, before fees'
          />
        </div>
      )
      for (const line of lines(container)) {
        const height = line.getBoundingClientRect().height
        const lineHeight = Number.parseFloat(getComputedStyle(line).lineHeight)
        expect(height).toBeLessThanOrEqual(lineHeight * 1.2)
      }
      const row = container.querySelector('[data-slot=data-card-value-row]')!
      const [value, delta] = [...row.children].map((el) =>
        el.getBoundingClientRect()
      )
      expect(Math.abs(value!.bottom - delta!.bottom)).toBeLessThan(8)
    })

  it('truncates house-length copy only past its limit at phone stat width', () => {
    const { container } = render(
      <div style={{ width: 166 }}>
        <DataCard
          label='Tickets sold'
          value={1842}
          delta={{ value: 214 }}
          context='This week, of 2,400'
        />
      </div>
    )
    for (const line of lines(container))
      expect(line.scrollWidth).toBeLessThanOrEqual(line.clientWidth)
  })

  it('truncates awkward copy on one line', () => {
    const { container } = render(
      <div style={{ width: 166 }}>
        <DataCard
          label='Tickets sold across every venue'
          value='$1,234,567.89'
          delta={{ value: 12 }}
          context='Onlastweekbeforefeesandcharges'
        />
      </div>
    )
    for (const line of lines(container)) {
      expect(line.getBoundingClientRect().height).toBeLessThanOrEqual(
        Number.parseFloat(getComputedStyle(line).lineHeight) * 1.2
      )
    }
  })
})
