import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

// Core's hover styles live in its sheets, but only this package runs browser
// tests, so they're checked here.

const STILL = '*, *::before, *::after { transition: none !important }'
const HOVER = '(hover: hover)'
const NO_HOVER = 'not (hover: hover)'

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
  setHoverCapable(true)
  await userEvent.unhover(document.body)
  host?.remove()
})

function hoverGates(rules: CSSRuleList, found: CSSMediaRule[] = []) {
  for (const rule of Array.from(rules)) {
    if (
      rule instanceof CSSMediaRule &&
      [HOVER, NO_HOVER].includes(rule.conditionText)
    )
      found.push(rule)
    if ('cssRules' in rule)
      hoverGates((rule as CSSGroupingRule).cssRules, found)
  }
  return found
}

let gates: { rule: CSSMediaRule; hover: boolean }[] = []

// Playwright can't emulate a device without hover, so each hover gate is
// pinned to match or not, as a touch screen would decide it.
function setHoverCapable(capable: boolean) {
  if (!gates.length)
    gates = Array.from(document.styleSheets)
      .flatMap((sheet) => hoverGates(sheet.cssRules))
      .map((rule) => ({ rule, hover: rule.conditionText === HOVER }))
  for (const { rule, hover } of gates)
    rule.media.mediaText = hover === capable ? 'all' : 'not all'
}

const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

function mount(markup: string) {
  host = document.createElement('div')
  host.style.padding = '24px'
  host.innerHTML = markup
  document.body.append(host)
  return host.querySelector<HTMLElement>('[data-target]')!
}

const look = (element: HTMLElement) => {
  const style = getComputedStyle(element)
  return {
    background: style.backgroundColor,
    border: style.borderColor,
    shadow: style.boxShadow,
    transform: style.transform,
    backdrop: style.backdropFilter
  }
}

const TRANSLUCENT_FIELD = `<div data-target tabindex="-1" class="emphasis-raised is-translucent is-interactive-field h-10 w-60 rounded-lg px-3">Gold Coast</div>`

const cases = {
  'emphasis-strong button': `<button data-target class="intent-accent emphasis-strong is-interactive h-10 rounded-full px-4">Buy tickets</button>`,
  'emphasis-normal button': `<button data-target class="emphasis-normal is-interactive h-10 rounded-full px-4">Buy tickets</button>`,
  'emphasis-raised select trigger': `<div data-target tabindex="-1" class="emphasis-raised is-interactive-field h-10 w-60 rounded-lg px-3">Gold Coast</div>`,
  'invalid field': `<input data-target aria-invalid="true" class="emphasis-field is-interactive-field h-10 w-60 rounded-lg px-3" />`,
  'field group': `<div data-target class="emphasis-raised is-interactive-field-group flex h-10 w-60 rounded-lg px-3"><span>Venue</span></div>`,
  'translucent field': TRANSLUCENT_FIELD
}

describe.each(Object.entries(cases))('%s', (_, markup) => {
  it('keeps its resting look under a tap on a touch screen', async () => {
    setHoverCapable(false)
    const target = mount(markup)
    await frame()
    const rest = look(target)

    await userEvent.hover(target)
    await frame()

    expect(target.matches(':hover')).toBe(true)
    expect(look(target)).toEqual(rest)
  })

  it('changes on hover where a pointer can hover', async () => {
    setHoverCapable(true)
    const target = mount(markup)
    await frame()
    const rest = look(target)

    await userEvent.hover(target)
    await frame()

    expect(look(target)).not.toEqual(rest)
  })
})

it.runIf(CSS.supports('backdrop-filter', 'blur(0)'))(
  'keeps a translucent field see-through on either screen',
  async () => {
    for (const capable of [false, true]) {
      setHoverCapable(capable)
      const target = mount(TRANSLUCENT_FIELD)
      await frame()

      expect(look(target).backdrop).toBe('blur(12px)')
      host?.remove()
    }
  }
)
