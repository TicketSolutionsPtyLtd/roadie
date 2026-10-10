import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

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
afterEach(async () => {
  await commands.pointer([{ type: 'up' }, { type: 'move', x: 0, y: 0 }])
  document.body.replaceChildren()
  document.documentElement.classList.remove('dark')
})

function mount(className: string) {
  const before = document.createElement('button')
  before.textContent = 'Before'
  const target = document.createElement('div')
  target.className = className
  target.tabIndex = 0
  target.textContent = 'A scroll region'
  target.style.inlineSize = '200px'
  target.style.blockSize = '100px'
  document.body.append(before, target)
  return { before, target }
}

async function focusByKeyboard(className: string) {
  const { before, target } = mount(className)
  before.focus()
  await userEvent.tab()
  expect(document.activeElement).toBe(target)
  return target
}

function ring(element: Element) {
  const style = getComputedStyle(element)
  return {
    style: style.outlineStyle,
    width: style.outlineWidth,
    color: style.outlineColor,
    offset: style.outlineOffset
  }
}

const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const tokenWidth = () => token('--focus-ring-width')

/** The ring `is-interactive` shows on keyboard focus. */
async function tokenRing() {
  const reference = await focusByKeyboard('is-interactive')
  const expected = ring(reference)
  document.body.replaceChildren()
  return expected
}

async function pressOn(target: Element) {
  const box = target.getBoundingClientRect()
  await commands.pointer([
    { type: 'move', x: box.x + box.width / 2, y: box.y + box.height / 2 },
    { type: 'down' }
  ])
}

describe('is-focusable', () => {
  it.each([
    ['light', false, '--focus-ring-opacity'],
    ['dark', true, '--focus-ring-opacity-dark']
  ])(
    'shows the focus-ring tokens’ ring on keyboard focus in %s mode',
    async (_mode, dark, opacity) => {
      document.documentElement.classList.toggle('dark', dark)
      const target = await focusByKeyboard('is-focusable')
      const alpha = parseFloat(token(opacity)) / 100

      expect(ring(target)).toMatchObject({
        style: 'solid',
        width: tokenWidth(),
        offset: '0px'
      })
      expect(ring(target).color).toMatch(new RegExp(`/ ${alpha}\\)$`))
    }
  )

  it('keeps the cursor auto, where is-interactive sets a pointer', async () => {
    const interactive = mount('is-interactive').target
    expect(getComputedStyle(interactive).cursor).toBe('pointer')
    document.body.replaceChildren()

    const target = mount('is-focusable').target

    expect(getComputedStyle(target).cursor).toBe('auto')
  })

  it('shows no ring when a mouse press focuses it', async () => {
    const keyboard = await focusByKeyboard('is-focusable')
    expect(ring(keyboard).width).toBe(tokenWidth())
    document.body.replaceChildren()

    const { target } = mount('is-focusable')
    await pressOn(target)

    expect(document.activeElement).toBe(target)
    expect(target.matches(':focus-visible')).toBe(false)
    expect(parseFloat(ring(target).width) || 0).toBe(0)
  })

  it('doesn’t scale on press, where is-interactive does', async () => {
    const interactive = mount('is-interactive').target
    await pressOn(interactive)
    expect(interactive.matches(':active')).toBe(true)
    expect(getComputedStyle(interactive).transform).not.toBe('none')
    await commands.pointer([{ type: 'up' }])
    document.body.replaceChildren()

    const { target } = mount('is-focusable')
    await pressOn(target)

    expect(target.matches(':active')).toBe(true)
    expect(getComputedStyle(target).transform).toBe('none')
  })

  it('composes with is-interactive in either order, keeping its transition', async () => {
    const expected = await tokenRing()
    const transition = getComputedStyle(
      mount('is-interactive').target
    ).transitionProperty
    document.body.replaceChildren()

    for (const className of [
      'is-focusable is-interactive',
      'is-interactive is-focusable'
    ]) {
      const target = await focusByKeyboard(className)

      expect(ring(target)).toEqual(expected)
      expect(getComputedStyle(target).transitionProperty).toBe(transition)
      expect(getComputedStyle(target).cursor).toBe('pointer')
      document.body.replaceChildren()
    }
  })

  it('keeps a visible ring in forced colours', async () => {
    await commands.forcedColors(true)
    try {
      const target = await focusByKeyboard('is-focusable')

      expect(ring(target)).toMatchObject({
        style: 'solid',
        width: tokenWidth()
      })
      expect(ring(target).color).not.toMatch(/^rgba\(0, 0, 0, 0\)$|transparent/)
    } finally {
      await commands.forcedColors(false)
    }
  })
})
