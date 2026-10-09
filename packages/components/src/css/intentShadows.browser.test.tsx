import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

// Shadows take the hue of the nearest intent. The shadow tokens hold
// var(--intent-hue), which a custom property resolves where it is declared,
// so a token declared only on :root would keep the root hue everywhere.

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

const ROOT_HUE = 247

const INTENTS = [
  ['danger', 28],
  ['success', 185],
  ['brand-orange', 42],
  ['brand-purple', 303]
] as const

const SURFACES = [
  'shadow-md',
  'emphasis-raised',
  'emphasis-floating',
  'inset-shadow-xs',
  'emphasis-sunken',
  'emphasis-field'
] as const

// Only the tinted layers: the rim light and dark mode's inset highlight are
// white. Browsers keep oklch() as authored in the computed value.
function shadowHues(element: Element) {
  const shadow = getComputedStyle(element).boxShadow
  return [...shadow.matchAll(/oklch\(\s*[\d.]+%?\s+[\d.]+\s+([\d.]+)/g)].map(
    ([, hue]) => Number(hue)
  )
}

function renderSurfaces(wrapper: string, own = '') {
  const { container } = render(
    <div className={wrapper}>
      {SURFACES.map((surface) => (
        <div
          key={surface}
          data-surface={surface}
          className={`${surface} ${own}`}
        >
          {surface}
        </div>
      ))}
    </div>
  )
  return (surface: string) =>
    container.querySelector(`[data-surface='${surface}']`)!
}

function expectHue(element: Element, hue: number) {
  const hues = shadowHues(element)
  expect(hues.length).toBeGreaterThan(0)
  for (const found of hues) expect(found).toBeCloseTo(hue, 0)
}

describe.each([
  ['light', false],
  ['dark', true]
] as const)('shadows in %s mode', (_mode, dark) => {
  it.each(SURFACES)('%s takes the root hue outside any intent', (surface) => {
    document.documentElement.classList.toggle('dark', dark)
    expectHue(renderSurfaces('')(surface), ROOT_HUE)
  })

  describe.each(INTENTS)('in intent-%s', (intent, hue) => {
    it.each(SURFACES)('%s takes the hue from an ancestor', (surface) => {
      document.documentElement.classList.toggle('dark', dark)
      expectHue(renderSurfaces(`intent-${intent}`)(surface), hue)
    })

    it.each(SURFACES)('%s takes the hue on its own element', (surface) => {
      document.documentElement.classList.toggle('dark', dark)
      expectHue(renderSurfaces('', `intent-${intent}`)(surface), hue)
    })

    it.each(SURFACES)('%s is neutral again under intent-neutral', (surface) => {
      document.documentElement.classList.toggle('dark', dark)
      const get = renderSurfaces(`intent-${intent}`, 'intent-neutral')
      expectHue(get(surface), ROOT_HUE)
    })
  })
})
