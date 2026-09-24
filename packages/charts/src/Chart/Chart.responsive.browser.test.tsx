import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { CHART_LABEL_LIMITS } from '@oztix/roadie-core/dashboard-layout'

import { Chart } from '.'
import roadieCss from '../../vitest.browser.css?inline'

function useStylesheet(css: string) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
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
