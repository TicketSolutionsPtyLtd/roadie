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

// 1rem top padding, one 2.5rem control, and 0.5rem bottom padding.
const CONTROL_HEADER = 64

const frames = (count = 4) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

async function settle() {
  await frames()
  for (const animation of document.getAnimations()) animation.finish()
  await frames()
}

function renderTitled() {
  const { container } = render(
    <div style={{ width: 600, height: 500, display: 'grid' }}>
      <Pane>
        <Pane.Header>
          <Pane.Title>Corduroy Lagoon Sessions</Pane.Title>
        </Pane.Header>
        <div style={{ height: 2000 }} />
      </Pane>
    </div>
  )
  const header = container.querySelector<HTMLElement>(
    '[data-slot="pane-header"]'
  )!
  const viewport = container.querySelector<HTMLElement>(
    '[data-slot="pane-viewport"]'
  )!
  return { header, viewport }
}

const transitioned = (element: HTMLElement) => {
  const style = getComputedStyle(element)
  const durations = style.transitionDuration.split(',').map(parseFloat)
  return style.transitionProperty
    .split(',')
    .map((property) => property.trim())
    .filter((_, index) => (durations[index % durations.length] ?? 0) > 0)
}

describe('a pane header', () => {
  it('holds a title-only header at one control height once collapsed, without animating the floor', async () => {
    const { header, viewport } = renderTitled()
    await settle()
    expect(header.getBoundingClientRect().height).toBeGreaterThan(
      CONTROL_HEADER
    )

    viewport.scrollTop = 400
    viewport.dispatchEvent(new Event('scroll'))
    await settle()

    expect(header).toHaveAttribute('data-collapsed', 'true')
    expect(header.getBoundingClientRect().height).toBeCloseTo(CONTROL_HEADER, 0)
    expect(transitioned(header)).not.toContain('min-height')
    expect(transitioned(header)).not.toContain('all')
  })
})
