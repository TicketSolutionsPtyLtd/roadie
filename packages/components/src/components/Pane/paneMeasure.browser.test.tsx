import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import { Pane, type PaneMeasure, type PaneMeasureAlign } from '.'
import roadieCss from '../../../vitest.browser.css?inline'

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
          <Pane.Title>Corduroy Lagoon Sessions</Pane.Title>
        </Pane.Header>
        <Pane.BodyTitle>Corduroy Lagoon Sessions</Pane.BodyTitle>
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

describe('a pane measure around Pane.Body', () => {
  // Short content, so a body that shrink wraps shows it.
  function renderBody(measure: PaneMeasure, measureAlign?: PaneMeasureAlign) {
    const { container } = render(
      <div style={{ width: WIDTH, height: 600, display: 'grid' }}>
        <Pane measure={measure} measureAlign={measureAlign}>
          <Pane.Header />
          <Pane.BodyTitle>Gigs</Pane.BodyTitle>
          <Pane.Body>
            <div id='card'>Sold out</div>
          </Pane.Body>
        </Pane>
      </div>
    )
    const box = (selector: string) =>
      container.querySelector(selector)!.getBoundingClientRect()
    const pane = container.querySelector<HTMLElement>('[data-slot="pane"]')!
    const probe = document.createElement('span')
    probe.style.cssText = 'position:absolute;width:var(--pane-measure)'
    pane.append(probe)
    const measured = probe.getBoundingClientRect().width
    probe.remove()
    return {
      pane: box('[data-slot="pane"]'),
      body: box('[data-slot="pane-body"]'),
      card: box('#card'),
      title: box('[data-slot="pane-body-title"]'),
      measured
    }
  }

  it.each([
    ['narrow', 'center'],
    ['readable', 'center'],
    ['wide', 'center'],
    ['narrow', 'start'],
    ['readable', 'start'],
    ['wide', 'start']
  ] as const)(
    'fills the %s measure, aligned to the %s, with its title',
    (measure, align) => {
      const { pane, body, card, title, measured } = renderBody(measure, align)
      const left = align === 'start' ? INSET : (pane.width - measured) / 2

      expect(measured).toBeGreaterThan(0)
      for (const box of [body, card, title]) {
        expect(box.width).toBeCloseTo(measured, 0)
        expect(box.left - pane.left).toBeCloseTo(left, 0)
      }
    }
  )
})

describe('a measured pane nested in a Pane.Body', () => {
  // A button shrinks to its label in a measured pane; the outer pane's fill mustn't stretch it.
  function buttonWidth(nested: boolean) {
    const inner = (
      <div style={{ height: 300, display: 'grid' }}>
        <Pane measure='narrow'>
          <button id='buy' type='button'>
            Buy
          </button>
        </Pane>
      </div>
    )
    const { container } = render(
      <div style={{ width: WIDTH, height: 600, display: 'grid' }}>
        {nested ? (
          <Pane measure='wide'>
            <Pane.Body>{inner}</Pane.Body>
          </Pane>
        ) : (
          inner
        )}
      </div>
    )
    const width = container.querySelector('#buy')!.getBoundingClientRect().width
    cleanup()
    return width
  }

  it('lays out its content as it would on its own', () => {
    const alone = buttonWidth(false)

    expect(alone).toBeLessThan(384)
    expect(buttonWidth(true)).toBeCloseTo(alone, 0)
  })
})
