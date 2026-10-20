import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

// Core's tokens live in its sheets, but only this package runs browser tests.

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

const LIGHT_STEPS = { subtler: 5, subtle: 6, normal: 7, strong: 9 }
// A step further from the surface, for contrast on dark surfaces.
const DARK_NEUTRAL_STEPS = { subtler: 5, subtle: 7, normal: 8, strong: 10 }
const LEVELS = Object.keys(LIGHT_STEPS) as (keyof typeof LIGHT_STEPS)[]
// Literal so Tailwind's scan of the source generates each utility.
const UTILITY = {
  subtler: 'border-subtler',
  subtle: 'border-subtle',
  normal: 'border-normal',
  strong: 'border-strong'
}

function borderColour(scope: Element, className: string) {
  const probe = document.createElement('span')
  probe.className = `border ${className}`
  scope.appendChild(probe)
  const colour = getComputedStyle(probe).borderTopColor
  probe.remove()
  return colour
}

function scaleColour(scope: Element, variable: string) {
  const probe = document.createElement('span')
  probe.style.borderStyle = 'solid'
  probe.style.borderColor = `var(${variable})`
  scope.appendChild(probe)
  const colour = getComputedStyle(probe).borderTopColor
  probe.remove()
  return colour
}

function renderScopes() {
  const { container } = render(
    <div>
      <div data-testid='root' />
      <div data-testid='neutral' className='intent-neutral' />
      <div data-testid='brand' className='intent-brand' />
    </div>
  )
  const scope = (id: string) => container.querySelector(`[data-testid=${id}]`)!
  return {
    root: scope('root'),
    neutral: scope('neutral'),
    brand: scope('brand')
  }
}

describe('neutral borders', () => {
  it.each(LEVELS)('border-%s keeps its light step in light mode', (level) => {
    const { root, neutral } = renderScopes()
    const expected = scaleColour(root, `--color-neutral-${LIGHT_STEPS[level]}`)
    expect(borderColour(root, UTILITY[level])).toBe(expected)
    expect(borderColour(neutral, UTILITY[level])).toBe(expected)
  })

  it.each(LEVELS)(
    'border-%s stands a step further from dark surfaces',
    (level) => {
      document.documentElement.classList.add('dark')
      const { root, neutral } = renderScopes()
      const expected = scaleColour(
        root,
        `--color-neutral-${DARK_NEUTRAL_STEPS[level]}`
      )
      expect(borderColour(root, UTILITY[level])).toBe(expected)
      expect(borderColour(neutral, UTILITY[level])).toBe(expected)
    }
  )

  it.each(LEVELS)(
    'border-%s on other intents keeps its step in dark mode',
    (level) => {
      document.documentElement.classList.add('dark')
      const { brand } = renderScopes()
      expect(borderColour(brand, UTILITY[level])).toBe(
        scaleColour(brand, `--color-brand-${LIGHT_STEPS[level]}`)
      )
    }
  )
})
