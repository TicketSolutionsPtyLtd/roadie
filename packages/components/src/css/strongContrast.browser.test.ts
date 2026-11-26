import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  flatten,
  apcaLc as sharedApcaLc
} from '@oztix/roadie-browser-testing/contrast'
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
  'brand-blue',
  'brand-orange',
  'brand-purple',
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
// Moving the pointer takes a round trip to the browser, so only a test that
// hovered pays for moving it away.
let hovered = false
afterEach(async () => {
  if (hovered) await userEvent.unhover(document.body)
  hovered = false
  host?.remove()
  const root = document.documentElement
  root.classList.remove('dark')
  root.style.removeProperty('--accent-hue')
  root.style.removeProperty('--accent-chroma')
})

const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

// The hover state lands with the frame after the pointer moves.
async function hover(element: HTMLElement) {
  hovered = true
  await userEvent.hover(element)
  await frame()
}

function mount(markup: string) {
  host = document.createElement('div')
  host.innerHTML = markup
  document.body.append(host)
  return host.querySelector<HTMLElement>('[data-target]')!
}

function apcaLc(text: string, background: string) {
  return sharedApcaLc(flatten(text), flatten(background))
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
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('still reads at Lc 60 while hovered', async () => {
      setTheme(mode)
      setHoverCapable(true)
      const target = mount(strongButton(intent))
      const rest = getComputedStyle(target).backgroundColor
      await hover(target)
      expect(getComputedStyle(target).backgroundColor).not.toBe(rest)
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('still reads at Lc 60 while pressed', async () => {
      setTheme(mode)
      const target = mount(strongButton(intent, 'is-active'))
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('reads at Lc 60 on an inverted fill', async () => {
      setTheme(mode)
      const target = mount(
        `<div data-target class="intent-${intent} emphasis-inverted">Sold out</div>`
      )
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('reads at Lc 60 with text-inverted on bg-inverted', async () => {
      setTheme(mode)
      const target = mount(
        `<div data-target class="intent-${intent} bg-inverted text-inverted font-bold">Sold out</div>`
      )
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('reads at Lc 60 with text-on-strong on bg-strong', async () => {
      setTheme(mode)
      const target = mount(
        `<div data-target class="intent-${intent} bg-strong text-on-strong font-bold">Sold out</div>`
      )
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    // Overlays are fixed dark in both themes, so their label is fixed white.
    it.each(['emphasis-overlay', 'emphasis-overlay-subtle'])(
      'labels %s in white',
      async (overlay) => {
        setTheme(mode)
        const target = mount(
          `<div data-target class="intent-${intent} ${overlay}">Sold out</div>`
        )
        expect(flatten(getComputedStyle(target).color)).toEqual([255, 255, 255])
      }
    )

    it('flips text-inverted with the page, unlike text-on-strong', async () => {
      setTheme(mode)
      const target = mount(
        `<div class="intent-${intent}"><span data-target class="text-inverted"></span><span data-page class="text-normal"></span></div>`
      )
      const page = host!.querySelector<HTMLElement>('[data-page]')!
      const inverted = Math.abs(
        apcaLc(getComputedStyle(target).color, getComputedStyle(page).color)
      )
      expect(inverted).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })
  })

  describe.each(ACCENTS)('an accent of $name', (accent) => {
    it('reads at Lc 60 on a strong accent fill', async () => {
      setTheme(mode, accent)
      const target = mount(strongButton('accent'))
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('still reads at Lc 60 while hovered or pressed', async () => {
      setTheme(mode, accent)
      setHoverCapable(true)
      const hoveredButton = mount(strongButton('accent'))
      await hover(hoveredButton)
      expect(contrast(hoveredButton)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
      host?.remove()

      const pressed = mount(strongButton('accent', 'is-active'))
      expect(contrast(pressed)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })
  })
})
