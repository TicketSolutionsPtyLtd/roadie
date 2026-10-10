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

async function fieldRingColor() {
  const field = element('<input class="is-interactive-field" />')
  await focusAfterKey(field)
  const { color } = focusRing(field)
  field.remove()
  return color
}

describe('base focus ring', () => {
  it.each([
    ['light', false, '--focus-ring-opacity'],
    ['dark', true, '--focus-ring-opacity-dark']
  ])(
    'shows a plain link the accent ring, 4px with no gap, in %s mode',
    async (_mode, dark, opacity) => {
      document.documentElement.classList.toggle('dark', dark)
      const accent = await fieldRingColor()

      const ring = await plainLinkRing()

      expect(ring).toEqual({
        style: 'solid',
        width: '4px',
        color: accent,
        offset: '0px'
      })
      expect(ring.color).toMatch(new RegExp(`/ ${opacityToken(opacity)}\\)$`))
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
    'gives %s the base ring',
    async (className) => {
      const expected = await plainLinkRing()

      const target = await focusAfterKey(
        element(`<div class="${className}" tabindex="0">Region</div>`)
      )

      expect(focusRing(target)).toEqual(expected)
    }
  )

  it.each([
    ['a plain link', '<a href="#tickets">Tickets</a>'],
    ['is-interactive', '<div class="is-interactive" tabindex="0">Card</div>']
  ])(
    'keeps the accent ring for %s inside a danger intent',
    async (_, markup) => {
      const expected = await plainLinkRing()
      const danger = element('<div class="intent-danger"></div>')

      const inside = await focusAfterKey(element(markup, danger))

      expect(focusRing(inside).color).toBe(expected.color)
    }
  )
})
