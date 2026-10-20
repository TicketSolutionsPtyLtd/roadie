import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { ChartTooltip } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

describe('the chart tooltip in dark mode', () => {
  it('offers the same lifted fill to other tooltip renderers', () => {
    document.documentElement.classList.add('dark')
    const { container } = render(
      <div data-slot='chart'>
        <ChartTooltip
          title='Tickets sold'
          rows={[{ label: 'GA', value: '1,210' }]}
        />
        <div
          data-testid='knob'
          className='bg-(--ts-chart-tooltip-background)'
        />
      </div>
    )
    const tooltip = container.querySelector('[data-slot="chart-tooltip"]')!
    const knob = container.querySelector('[data-testid="knob"]')!
    expect(getComputedStyle(knob).backgroundColor).toBe(
      getComputedStyle(tooltip).backgroundColor
    )
  })
})
