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
// Unlifted step 9, for browsers without color-mix.
const FALLBACK_LABEL_LC = 55
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

    it('reads at Lc 60 with text-inverted on bg-inverted', async () => {
      setTheme(mode)
      const target = mount(
        `<div data-target class="intent-${intent} bg-inverted text-inverted font-bold">Sold out</div>`
      )
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('reads at Lc 60 with text-on-strong on bg-strong', async () => {
      setTheme(mode)
      const target = mount(
        `<div data-target class="intent-${intent} bg-strong text-on-strong font-bold">Sold out</div>`
      )
      await frame()
      expect(contrast(target)).toBeGreaterThanOrEqual(STRONG_LABEL_LC)
    })

    it('flips text-inverted with the page, unlike text-on-strong', async () => {
      setTheme(mode)
      const target = mount(
        `<div class="intent-${intent}"><span data-target class="text-inverted"></span><span data-page class="text-normal"></span></div>`
      )
      await frame()
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

function supportsRules(rules: CSSRuleList, found: CSSSupportsRule[] = []) {
  for (const rule of Array.from(rules)) {
    if (
      rule instanceof CSSSupportsRule &&
      rule.conditionText.startsWith('not') &&
      rule.conditionText.includes('color-mix')
    )
      found.push(rule)
    if ('cssRules' in rule)
      supportsRules((rule as CSSGroupingRule).cssRules, found)
  }
  return found
}

// Browsers that draw oklch but not color-mix take the `@supports not` branch.
// Re-applying it unconditionally, after the sheet, gives the same cascade.
function useColorMixFallback() {
  const rules = Array.from(document.styleSheets).flatMap((sheet) =>
    supportsRules(sheet.cssRules)
  )
  const css = rules
    .map((rule) => {
      const body = rule.cssText.replace(/^@supports[^{]*/, '@media all ')
      const parent = rule.parentRule
      return parent instanceof CSSStyleRule
        ? `${parent.selectorText} { ${body} }`
        : body
    })
    .join('\n')
  return { count: rules.length, remove: useStylesheet(css) }
}

describe('without color-mix', () => {
  let fallback: ReturnType<typeof useColorMixFallback>
  beforeAll(() => {
    fallback = useColorMixFallback()
  })
  afterAll(() => fallback.remove())

  it('has a fallback for every intent that mixes its strong fill', () => {
    expect(fallback.count).toBe(3)
  })

  describe.each(MODES)('%s mode', (mode) => {
    describe.each(['brand-secondary', 'success', 'warning'])(
      'intent-%s',
      (intent) => {
        it('falls back to the unmixed step 9 fill', async () => {
          setTheme(mode)
          const target = mount(
            `<div class="intent-${intent}">${strongButton(intent)}<i data-step style="background: var(--color-${intent}-9)"></i></div>`
          )
          await frame()
          const step = host!.querySelector<HTMLElement>('[data-step]')!
          expect(getComputedStyle(target).backgroundColor).toBe(
            getComputedStyle(step).backgroundColor
          )
        })

        it('lightens to its fallback step while hovered', async () => {
          setTheme(mode)
          setHoverCapable(true)
          const hoverStep = mode === 'dark' ? 11 : 7
          const target = mount(
            `<div class="intent-${intent}">${strongButton(intent)}<i data-step style="background: var(--color-${intent}-${hoverStep})"></i></div>`
          )
          await userEvent.hover(target)
          await frame()
          const step = host!.querySelector<HTMLElement>('[data-step]')!
          expect(getComputedStyle(target).backgroundColor).toBe(
            getComputedStyle(step).backgroundColor
          )
          expect(contrast(target)).toBeGreaterThanOrEqual(FALLBACK_LABEL_LC)
        })

        it.each(['', 'is-active'])(
          'fills the strong surface %s with a solid colour that reads',
          async (state) => {
            setTheme(mode)
            const target = mount(strongButton(intent, state))
            await frame()
            const { backgroundColor } = getComputedStyle(target)
            expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
            expect(contrast(target)).toBeGreaterThanOrEqual(FALLBACK_LABEL_LC)
          }
        )
      }
    )
  })
})
