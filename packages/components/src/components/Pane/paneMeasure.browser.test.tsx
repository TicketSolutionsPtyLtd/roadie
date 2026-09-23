import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Pane, type PaneMeasure, type PaneMeasureAlign } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from './testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const WIDTH = 1400
const INSET = 24

function renderPane(measure?: PaneMeasure, measureAlign?: PaneMeasureAlign) {
  const { container } = render(
    <div style={{ width: WIDTH, height: 600, display: 'grid' }}>
      <Pane measure={measure} measureAlign={measureAlign}>
        <Pane.Header>
          <Pane.Title>Paperbark Sessions</Pane.Title>
        </Pane.Header>
        <Pane.BodyTitle>Paperbark Sessions</Pane.BodyTitle>
        <p id='body'>Doors 7pm. General admission, standing.</p>
        <Pane.Footer>Footer</Pane.Footer>
      </Pane>
    </div>
  )
  const box = (selector: string) =>
    container.querySelector(selector)!.getBoundingClientRect()
  const pane = box('[data-slot="pane"]')
  return {
    pane,
    header: box('[data-slot="pane-header"]'),
    headerTitle: box('[data-slot="pane-title"]'),
    footer: box('[data-slot="pane-footer"]'),
    title: box('[data-slot="pane-body-title"]'),
    body: box('#body'),
    ch: (() => {
      const probe = document.createElement('span')
      probe.style.cssText = 'position:absolute;width:65ch'
      container.querySelector('[data-slot="pane"]')!.append(probe)
      const width = probe.getBoundingClientRect().width
      probe.remove()
      return width
    })()
  }
}

describe('a pane measure', () => {
  it.each([undefined, 'full'] as const)(
    'leaves the body the full column at %s',
    (measure) => {
      const { pane, body, headerTitle } = renderPane(measure)

      expect(body.width).toBeCloseTo(pane.width - 2 * INSET, 0)
      expect(headerTitle.left - pane.left).toBeCloseTo(INSET, 0)
    }
  )

  it.each([
    ['narrow', 384],
    ['wide', 896]
  ] as const)('caps the body at %s and centres it', (measure, width) => {
    const { pane, body } = renderPane(measure)

    expect(body.width).toBeCloseTo(width, 0)
    expect(body.left - pane.left).toBeCloseTo((pane.width - width) / 2, 0)
  })

  it('reads 65 characters of body text at readable, headings included', () => {
    const { body, title, ch } = renderPane('readable')

    expect(body.width).toBeCloseTo(ch, 0)
    expect(title.width).toBeCloseTo(ch, 0)
  })

  it('keeps the header and footer spanning the column', () => {
    const { pane, header, footer } = renderPane('narrow')

    expect(header.width).toBeCloseTo(pane.width, 0)
    expect(footer.width).toBeGreaterThan(pane.width - 2 * INSET - 1)
  })

  it("lines the header's title up with the body", () => {
    const { body, headerTitle } = renderPane('narrow')

    expect(headerTitle.left).toBeCloseTo(body.left, 0)
    expect(headerTitle.width).toBeCloseTo(body.width, 0)
  })

  it('holds the body to the start when asked', () => {
    const { pane, body, headerTitle } = renderPane('narrow', 'start')

    expect(body.width).toBeCloseTo(384, 0)
    expect(body.left - pane.left).toBeCloseTo(INSET, 0)
    expect(headerTitle.left - pane.left).toBeCloseTo(INSET, 0)
  })
})
