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
})
