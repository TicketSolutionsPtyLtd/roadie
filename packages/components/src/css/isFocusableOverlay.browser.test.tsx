import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

const STILL = '*, *::before, *::after { transition-duration: 0s !important }'
const OVERLAY =
  '.overlay::after { content: ""; position: absolute; inset: 0; pointer-events: none }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removers = [roadieCss, STILL, OVERLAY].map(useStylesheet)
  removeStylesheets = () => removers.forEach((remove) => remove())
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
  const cell = document.createElement('div')
  cell.style.cssText = 'position: relative; inline-size: 200px; padding: 16px'
  const target = document.createElement('a')
  target.href = '#sunset-sessions'
  target.className = `overlay ${className}`
  target.textContent = 'Sunset Sessions'
  cell.append(target)
  document.body.append(before, cell)
  return { before, target }
}

function focusByKeyboard(className: string) {
  const { before, target } = mount(className)
  before.focus()
  // Tab skips links in WebKit by default.
  target.focus({ focusVisible: true })
  expect(target.matches(':focus-visible')).toBe(true)
  return target
}

function ring(element: Element, pseudo?: string) {
  const style = getComputedStyle(element, pseudo)
  return {
    style: style.outlineStyle,
    width: style.outlineWidth,
    color: style.outlineColor,
    offset: style.outlineOffset
  }
}

const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

describe('is-focusable-overlay', () => {
  it.each([
    ['light', false, '--focus-ring-opacity'],
    ['dark', true, '--focus-ring-opacity-dark']
  ])(
    'rings the overlay inset with the focus-ring tokens in %s mode',
    (_mode, dark, opacity) => {
      document.documentElement.classList.toggle('dark', dark)
      const target = focusByKeyboard('is-focusable-overlay')
      const width = token('--focus-ring-width')
      const alpha = parseFloat(token(opacity)) / 100

      expect(ring(target, '::after')).toMatchObject({
        style: 'solid',
        width,
        offset: `-${width}`
      })
      expect(ring(target, '::after').color).toMatch(
        new RegExp(`/ ${alpha}\\)$`)
      )
      expect(ring(target).style).toBe('none')
    }
  )

  it('replaces a subtle link’s own ring with the overlay’s', () => {
    const target = focusByKeyboard('link-subtle is-focusable-overlay')

    expect(ring(target).style).toBe('none')
    expect(ring(target, '::after').style).toBe('solid')
  })

  it('replaces the link’s ring when its utility comes later in the sheet', () => {
    const removeLater = useStylesheet(
      '@layer utilities { .link-subtle:focus-visible { outline: 3px solid } }'
    )
    try {
      const target = focusByKeyboard('link-subtle is-focusable-overlay')

      expect(ring(target).style).toBe('none')
    } finally {
      removeLater()
    }
  })

  it('shows no ring when the overlay isn’t focused', () => {
    const { target } = mount('is-focusable-overlay')

    expect(ring(target, '::after').style).toBe('none')
  })

  it('keeps a visible ring in forced colours', async () => {
    await commands.forcedColors(true)
    try {
      const target = focusByKeyboard('is-focusable-overlay')

      expect(ring(target, '::after')).toMatchObject({
        style: 'solid',
        width: token('--focus-ring-width')
      })
      expect(ring(target, '::after').color).not.toMatch(
        /^rgba\(0, 0, 0, 0\)$|transparent/
      )
    } finally {
      await commands.forcedColors(false)
    }
  })
})
