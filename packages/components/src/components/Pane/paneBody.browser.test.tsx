import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Pane } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from './testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function renderPane(body: React.ReactNode) {
  const { container } = render(
    <div style={{ width: 600, height: 500, display: 'grid' }}>
      <Pane>
        <Pane.Header>
          <Pane.Title>Weekly Pass</Pane.Title>
        </Pane.Header>
        {body}
      </Pane>
    </div>
  )
  const box = (slot: string) =>
    container.querySelector(`[data-slot="${slot}"]`)!.getBoundingClientRect()
  return { container, box }
}

describe('Pane.Body', () => {
  it('fills the height the header leaves', () => {
    const { box } = renderPane(
      <Pane.Body>
        <p>General admission</p>
      </Pane.Body>
    )

    expect(box('pane-body').top).toBeCloseTo(box('pane-header').bottom, 0)
    expect(box('pane-body').bottom).toBeCloseTo(box('pane-viewport').bottom, 0)
  })

  it('lets a child grow to the bottom edge', () => {
    const { container, box } = renderPane(
      <Pane.Body className='flex flex-col'>
        <div data-testid='band' className='grow' />
      </Pane.Body>
    )
    const band = container
      .querySelector('[data-testid="band"]')!
      .getBoundingClientRect()

    expect(band.bottom).toBeCloseTo(box('pane-viewport').bottom, 0)
  })

  it('grows past the pane and scrolls when its content is taller', () => {
    const { container, box } = renderPane(
      <Pane.Body>
        <div style={{ height: 2000 }} />
      </Pane.Body>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!

    expect(box('pane-body').height).toBeGreaterThanOrEqual(2000)
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
  })

  it('leaves a pane without one to its content height', () => {
    const { container } = renderPane(
      <p data-testid='body'>General admission</p>
    )
    const content = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-content"]'
    )!

    expect(getComputedStyle(content).display).toBe('block')
  })

  it('gives a data-pane-fill child the height the rest leave, without scrolling', () => {
    const { container, box } = renderPane(
      <Pane.Body>
        <div data-testid='fill' data-pane-fill style={{ overflow: 'auto' }}>
          <div style={{ height: 3000 }} />
        </div>
        <p data-testid='after'>12 shows</p>
      </Pane.Body>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    const fill = container
      .querySelector('[data-testid="fill"]')!
      .getBoundingClientRect()
    const after = container
      .querySelector('[data-testid="after"]')!
      .getBoundingClientRect()

    expect(viewport.scrollHeight - viewport.clientHeight).toBeLessThanOrEqual(1)
    expect(fill.top).toBeCloseTo(box('pane-header').bottom, 0)
    expect(fill.height).toBeGreaterThan(200)
    expect(after.bottom).toBeLessThanOrEqual(box('pane-viewport').bottom + 1)
  })
})

describe('Pane sticky bottom', () => {
  it('publishes the footer height as --pane-sticky-bottom, and drops it with the footer', async () => {
    function Body({ footer }: { footer: boolean }) {
      return (
        <div style={{ width: 600, height: 500, display: 'grid' }}>
          <Pane>
            <Pane.Body>
              <p>General admission</p>
            </Pane.Body>
            {footer && (
              <Pane.Footer>
                <p>Footer</p>
              </Pane.Footer>
            )}
          </Pane>
        </div>
      )
    }
    const { container, rerender } = render(<Body footer={false} />)
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    const inset = () =>
      getComputedStyle(viewport).getPropertyValue('--pane-sticky-bottom').trim()

    expect(inset()).toBe('0px')
    rerender(<Body footer />)
    const footer = container.querySelector<HTMLElement>(
      '[data-slot="pane-footer"]'
    )!
    await expect.poll(inset).toBe(`${footer.offsetHeight}px`)
    expect(footer.offsetHeight).toBeGreaterThan(0)
    rerender(<Body footer={false} />)
    await expect.poll(inset).toBe('0px')
  })
})

describe('Pane sticky bottom as the footer resizes', () => {
  it('follows the footer to its new height', async () => {
    const { container } = renderPane(
      <>
        <Pane.Body>
          <p>General admission</p>
        </Pane.Body>
        <Pane.Footer>
          <p data-testid='footer-content'>Footer</p>
        </Pane.Footer>
      </>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    const footer = container.querySelector<HTMLElement>(
      '[data-slot="pane-footer"]'
    )!
    const inset = () =>
      getComputedStyle(viewport).getPropertyValue('--pane-sticky-bottom').trim()
    await expect.poll(inset).toBe(`${footer.offsetHeight}px`)
    const before = footer.offsetHeight

    container.querySelector<HTMLElement>(
      '[data-testid="footer-content"]'
    )!.style.height = '120px'

    expect(footer.offsetHeight).toBeGreaterThan(before)
    await expect.poll(inset).toBe(`${footer.offsetHeight}px`)
  })
})

describe('Pane.Footer', () => {
  it('casts its shadow up over the body', () => {
    const { container, box } = renderPane(
      <>
        <Pane.Body>
          <p>General admission</p>
        </Pane.Body>
        <Pane.Footer>
          <p>Footer</p>
        </Pane.Footer>
      </>
    )
    const footer = container.querySelector<HTMLElement>(
      '[data-slot="pane-footer"]'
    )!
    const shade = getComputedStyle(footer, '::after')
    const content = footer.querySelector('p')!.getBoundingClientRect()

    expect(shade.boxShadow).not.toBe('none')
    expect(shade.scale).toBe('1 -1')
    expect(content.top - box('pane-footer').top).toBeCloseTo(12, 0)
  })
})
