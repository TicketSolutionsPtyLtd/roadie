import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import { setHoverCapable } from './testUtils'

// Core's colour tokens live in its sheets, but only this package runs browser
// tests, so the rendered pairs are checked here.

const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]
const MODES = ['light', 'dark'] as const
const ACCENTS = [
  { name: 'Oztix blue', hue: 247, chroma: 0.168 },
  { name: 'red', hue: 28, chroma: 0.2 },
  { name: 'yellow', hue: 86, chroma: 0.16 },
  { name: 'green', hue: 145, chroma: 0.2 },
  { name: 'violet', hue: 303, chroma: 0.25 },
  { name: 'pink', hue: 350, chroma: 0.25 }
]
const AA_TEXT = 4.5
const STILL = '*, *::before, *::after { transition: none !important }'

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

let host: HTMLElement | undefined
afterEach(async () => {
  await userEvent.unhover(document.body)
  host?.remove()
  const root = document.documentElement
  root.classList.remove('dark')
  root.style.removeProperty('--accent-hue')
  root.style.removeProperty('--accent-chroma')
})

const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

function mount(markup: string) {
  host = document.createElement('div')
  host.innerHTML = markup
  document.body.append(host)
  return host.querySelector<HTMLElement>('[data-target]')!
}

// The canvas resolves any CSS colour (oklch, color-mix) to the sRGB pixel
// that is actually painted.
const canvas = document.createElement('canvas').getContext('2d', {
  willReadFrequently: true
})!
function toRgb(color: string) {
  canvas.clearRect(0, 0, 1, 1)
  canvas.fillStyle = color
  canvas.fillRect(0, 0, 1, 1)
  return Array.from(canvas.getImageData(0, 0, 1, 1).data.slice(0, 3))
}

function luminance(color: string) {
  const [r, g, b] = toRgb(color).map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(element: HTMLElement) {
  const style = getComputedStyle(element)
  const [light, dark] = [
    luminance(style.backgroundColor),
    luminance(style.color)
  ].sort((a, b) => b - a)
  return (light! + 0.05) / (dark! + 0.05)
}

function setTheme(mode: (typeof MODES)[number], accent = ACCENTS[0]!) {
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  root.style.setProperty('--accent-hue', String(accent.hue))
  root.style.setProperty('--accent-chroma', String(accent.chroma))
}

const strongButton = (intent: string, extra = '') =>
  `<button data-target class="intent-${intent} emphasis-strong is-interactive ${extra} h-10 rounded-full px-4 text-sm">Buy tickets</button>`

describe.each(MODES)('%s mode', (mode) => {
  describe.each(INTENTS)('intent-%s', (intent) => {
    it('reads at AA on a strong fill', async () => {
      setTheme(mode)
      const target = mount(strongButton(intent))
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('still reads at AA while hovered', async () => {
      setTheme(mode)
      setHoverCapable(true)
      const target = mount(strongButton(intent))
      const rest = getComputedStyle(target).backgroundColor
      await userEvent.hover(target)
      await frame()
      expect(getComputedStyle(target).backgroundColor).not.toBe(rest)
      expect(contrast(target)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('still reads at AA while pressed', async () => {
      setTheme(mode)
      const target = mount(strongButton(intent, 'is-active'))
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(AA_TEXT)
    })

    it('reads at AA on an inverted fill', async () => {
      setTheme(mode)
      const target = mount(
        `<div data-target class="intent-${intent} emphasis-inverted">Sold out</div>`
      )
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(AA_TEXT)
    })
  })

  describe.each(ACCENTS)('an accent of $name', (accent) => {
    it('reads at AA on a strong accent fill', async () => {
      setTheme(mode, accent)
      const target = mount(strongButton('accent'))
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(AA_TEXT)
    })
  })
})
