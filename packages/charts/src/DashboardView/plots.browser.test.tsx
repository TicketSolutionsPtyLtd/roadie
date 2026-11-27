import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'
import type { StaticPlot } from '@oztix/roadie-core/dashboard'

import roadieCss from '../../vitest.browser.css?inline'
import { PlotView } from './plots'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const IMAGE = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'

function shownBands(width: number, plot: StaticPlot) {
  const { container } = render(
    <div style={{ width }}>
      <PlotView plot={plot} />
    </div>
  )
  return [...container.querySelectorAll<HTMLElement>('[data-plot-band]')]
    .filter((band) => getComputedStyle(band).display !== 'none')
    .map((band) => band.dataset.plotBand)
}

describe('A static plot picks its image for its width', () => {
  const all: StaticPlot = {
    kind: 'static',
    src: IMAGE,
    alt: 'Sales pace',
    narrow: { src: IMAGE },
    wide: { src: IMAGE }
  }

  it.each([
    [400, ['narrow']],
    [479, ['narrow']],
    [480, ['default']],
    [959, ['default']],
    [960, ['wide']]
  ])('shows one band at %ipx', (width, expected) => {
    expect(shownBands(width, all)).toEqual(expected)
  })

  it.each([400, 700, 1000])(
    'keeps the default at %ipx when it is the only image',
    (width) => {
      expect(
        shownBands(width, { kind: 'static', src: IMAGE, alt: 'Sales pace' })
      ).toEqual(['default'])
    }
  )
})
