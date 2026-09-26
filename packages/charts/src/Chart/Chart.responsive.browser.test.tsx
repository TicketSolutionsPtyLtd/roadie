import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { CHART_LABEL_LIMITS } from '@oztix/roadie-core/dashboard-layout'

import { Chart } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { ChartLegend } from '../ChartLegend'
import { LineChart } from '../LineChart'
import { paceExample } from '../LineChart/examples'
import { afterResize } from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const table = {
  columns: [{ key: 'a', header: 'A', kind: 'number' as const }],
  rows: [{ a: 1 }]
}

const CASES: {
  size: 'sm' | 'md' | 'lg' | 'full'
  width: number
  label: string
}[] = [
  { size: 'sm', width: 292, label: 'Julia Jacklin GA pace' },
  { size: 'md', width: 292, label: 'Julia Jacklin GA pace' },
  { size: 'lg', width: 328, label: 'Genesis Owusu, GA sell rate' },
  { size: 'full', width: 328, label: 'Genesis Owusu, GA sell rate' }
]

describe('Chart label does not truncate at its narrowest width', () => {
  it.each(CASES)('$size at $width px', ({ size, width, label }) => {
    expect(label.length).toBe(CHART_LABEL_LIMITS[size])
    const { container } = render(
      <div style={{ width }}>
        <Chart label={label} size={size} source='Oztix sales.' table={table}>
          <svg role='img' aria-label='chart' />
        </Chart>
      </div>
    )
    const labelEl = container.querySelector('[data-slot=data-card-label]')!
    expect(labelEl.scrollWidth).toBeLessThanOrEqual(labelEl.clientWidth)
  })
})

describe('Chart legend on a narrow card', () => {
  const pace = (legend?: boolean) =>
    render(
      <div style={{ width: 360 }}>
        <Chart
          label='Sales pace'
          size='md'
          source='Oztix sales.'
          legend={
            legend && <ChartLegend items={[{ label: 'Sold', shape: 'line' }]} />
          }
        >
          <LineChart {...paceExample} />
        </Chart>
      </div>
    )
  const legends = (container: HTMLElement) =>
    container.querySelectorAll('[data-slot=chart-legend]').length

  it('shows only the card legend when the card passes one', async () => {
    const { container } = pace(true)
    await afterResize()
    expect(legends(container)).toBe(1)
    expect(
      container.querySelector('[data-slot=chart-legend]')
    ).toHaveTextContent('Sold')
  })

  it('lets the plot add its own legend otherwise', async () => {
    const { container } = pace(false)
    await afterResize()
    expect(legends(container)).toBe(1)
  })
})
