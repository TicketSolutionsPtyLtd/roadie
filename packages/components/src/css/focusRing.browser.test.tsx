import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import { focusAfterKey, focusRing, plainLinkRing } from './testUtils'

const STILL = '*, *::before, *::after { transition-duration: 0s !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(() => {
  document.body.replaceChildren()
  document.documentElement.classList.remove('dark')
})

function element(markup: string, within: HTMLElement = document.body) {
  const template = document.createElement('template')
  template.innerHTML = markup
  const node = template.content.firstElementChild as HTMLElement
  within.append(node)
  return node
}

const opacityToken = (name: string) =>
  parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  ) / 100

/** A scale's step 9 at the given alpha, as the browser serialises it. */
function step9At(scale: string, alpha: number) {
  const probe = element(`<span style="color: var(--color-${scale}-9)"></span>`)
  const { color } = getComputedStyle(probe)
  probe.remove()
  return color.replace(/\)$/, ` / ${alpha})`)
}

describe('base focus ring', () => {
  it.each([
    ['light', false, '--focus-ring-opacity'],
    ['dark', true, '--focus-ring-opacity-dark']
  ])(
    'shows a plain link a 4px neutral ring with no gap in %s mode',
    async (_mode, dark, opacity) => {
      document.documentElement.classList.toggle('dark', dark)

      const ring = await plainLinkRing()

      expect(ring).toEqual({
        style: 'solid',
        width: '4px',
        color: step9At('neutral', opacityToken(opacity)),
        offset: '0px'
      })
    }
  )

  it.each(['danger', 'success', 'accent'])(
    'colours a plain link’s ring from its %s intent parent',
    async (intent) => {
      const parent = element(`<div class="intent-${intent}"></div>`)

      const ring = await plainLinkRing(parent)

      expect(ring.color).toBe(
        step9At(intent, opacityToken('--focus-ring-opacity'))
      )
    }
  )

  it('gives a plain button the same ring as a plain link', async () => {
    const expected = await plainLinkRing()

    const button = await focusAfterKey(
      element('<button type="button">Buy tickets</button>')
    )

    expect(focusRing(button)).toEqual(expected)
  })
})

describe('one focus ring', () => {
  it.each(['is-focusable', 'is-interactive'])(
    'gives %s the base ring, inside an intent too',
    async (className) => {
      for (const parent of [
        document.body,
        element('<div class="intent-danger"></div>')
      ]) {
        const expected = await plainLinkRing(parent)

        const target = await focusAfterKey(
          element(`<div class="${className}" tabindex="0">Region</div>`, parent)
        )

        expect(focusRing(target)).toEqual(expected)
        target.remove()
      }
    }
  )
})
