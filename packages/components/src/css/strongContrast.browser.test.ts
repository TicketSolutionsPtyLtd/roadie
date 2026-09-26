import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { getAccentChromaSync, getOklchHueSync } from '@oztix/roadie-core/colors'

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
// Accents as ThemeProvider sets them from a hex, saturated ones included.
const ACCENTS = [
  '#0091eb',
  '#e5484d',
  '#b68200',
  '#16a34a',
  '#7c3aed',
  '#e83068',
  '#0000f0',
  '#00ff00',
  '#ffff00',
  '#ff00ff',
  '#00ffff'
].map((hex) => ({
  name: hex,
  hue: Math.round(getOklchHueSync(hex)),
  chroma: +getAccentChromaSync(hex).toFixed(4)
}))
// APCA's floor for bold, button-sized labels.
const STRONG_LABEL_LC = 60
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
  return Array.from(canvas.getImageData(0, 0, 1, 1).data.slice(0, 3)).map(
    (channel) => channel / 255
  ) as [number, number, number]
}

// APCA-W3 0.0.98G, constants as published in Myndex/apca-w3
// (src/apca-w3.js, SA98G). Returns Lc; negative is light text on dark.
function apcaLc(text: string, background: string) {
  const screenY = ([r, g, b]: [number, number, number]) => {
    const y = 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4
    return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
  }
  const textY = screenY(toRgb(text))
  const backgroundY = screenY(toRgb(background))
  if (Math.abs(backgroundY - textY) < 0.0005) return 0
  if (backgroundY > textY) {
    const sapc = (backgroundY ** 0.56 - textY ** 0.57) * 1.14
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100
  }
  const sapc = (backgroundY ** 0.65 - textY ** 0.62) * 1.14
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100
}

function contrast(element: HTMLElement) {
  const { color, backgroundColor } = getComputedStyle(element)
  return Math.abs(apcaLc(color, backgroundColor))
}

function setTheme(mode: (typeof MODES)[number], accent = ACCENTS[0]!) {
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  root.style.setProperty('--accent-hue', String(accent.hue))
  root.style.setProperty('--accent-chroma', String(accent.chroma))
}

const strongButton = (intent: string, extra = '') =>
  `<button data-target class="intent-${intent} emphasis-strong is-interactive ${extra} h-10 rounded-full px-4 text-sm font-bold">Buy tickets</button>`

describe.each(MODES)('%s mode', (mode) => {
  describe.each(INTENTS)('intent-%s', (intent) => {
    it('reads at Lc 60 on a strong fill', async () => {
      setTheme(mode)
      const target = mount(strongButton(intent))
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('still reads at Lc 60 while hovered', async () => {
      setTheme(mode)
      setHoverCapable(true)
      const target = mount(strongButton(intent))
      const rest = getComputedStyle(target).backgroundColor
      await userEvent.hover(target)
      await frame()
      expect(getComputedStyle(target).backgroundColor).not.toBe(rest)
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('still reads at Lc 60 while pressed', async () => {
      setTheme(mode)
      const target = mount(strongButton(intent, 'is-active'))
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('reads at Lc 60 on an inverted fill', async () => {
      setTheme(mode)
      const target = mount(
        `<div data-target class="intent-${intent} emphasis-inverted">Sold out</div>`
      )
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })
  })

  describe.each(ACCENTS)('an accent of $name', (accent) => {
    it('reads at Lc 60 on a strong accent fill', async () => {
      setTheme(mode, accent)
      const target = mount(strongButton('accent'))
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('still reads at Lc 60 while hovered or pressed', async () => {
      setTheme(mode, accent)
      setHoverCapable(true)
      const hovered = mount(strongButton('accent'))
      await userEvent.hover(hovered)
      await frame()
      expect(contrast(hovered)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
      host?.remove()

      const pressed = mount(strongButton('accent', 'is-active'))
      await frame()
      expect(contrast(pressed)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })
  })
})
