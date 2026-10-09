import { type ReactElement, useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import axe, { type NodeResult } from 'axe-core'
import { afterAll, beforeAll, expect } from 'vitest'
import { commands, page, server, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Autocomplete } from '../components/Autocomplete'
import { Calendar } from '../components/Calendar'
import {
  DashboardPeriod,
  type DashboardPeriodValue
} from '../components/DashboardPeriod'
import { DatePicker } from '../components/DatePicker'
import { Field } from '../components/Field'
import { loadBrandFont, useStylesheet } from '../components/Pane/testUtils'
import { apcaLc, flatten, minimumLc, over } from '../css/contrastTestUtils'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'
const STILL = `
  *, *::before, *::after { transition: none !important; animation: none !important }
  html, body { height: 100%; margin: 0 }
`

export const widths = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 }
] as const

export const themes = ['light', 'dark'] as const

type Theme = (typeof themes)[number]

type Scenario = {
  name: string
  ui: () => ReactElement
  /** Brings the component to this state once rendered. */
  reach?: () => Promise<unknown>
}

function ShowDate() {
  const [value, setValue] = useState<string | null>('2026-10-23')
  return (
    <Field>
      <Field.Label>Show date</Field.Label>
      <DatePicker today={TODAY} value={value} onValueChange={setValue} />
    </Field>
  )
}

function Period() {
  const [value, setValue] = useState<DashboardPeriodValue>({
    range: 'this-month',
    compare: 'previous-period'
  })
  return (
    <DashboardPeriod today={TODAY} value={value} onValueChange={setValue} />
  )
}

function City() {
  return (
    <Field>
      <Field.Label>City</Field.Label>
      <Autocomplete items={['Adelaide', 'Brisbane', 'Melbourne', 'Sydney']}>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder='Type a city' />
        </Autocomplete.InputGroup>
        <Autocomplete.Portal>
          <Autocomplete.Positioner>
            <Autocomplete.Popup>
              <Autocomplete.List>
                {(city: string) => (
                  <Autocomplete.Item key={city} value={city}>
                    {city}
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
              <Autocomplete.Empty>No cities found</Autocomplete.Empty>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete>
    </Field>
  )
}

// Base UI mounts the popup before positioning it. axe counts the guards as
// part of an open modal only once the dialog is on screen, and otherwise
// reports them as aria-hidden-focus (seen in Firefox).
const opened = async (trigger: HTMLElement) => {
  await userEvent.click(trigger)
  await expect.element(page.getByRole('dialog')).toBeInViewport()
}

export const scenarios: Scenario[] = [
  {
    name: 'calendar-range',
    ui: () => (
      <Calendar
        mode='range'
        today={TODAY}
        defaultSelected={{ start: '2026-10-12', end: '2026-10-16' }}
      />
    )
  },
  { name: 'date-picker-closed', ui: () => <ShowDate /> },
  {
    name: 'date-picker-open',
    ui: () => <ShowDate />,
    reach: () => opened(screen.getByRole('button', { name: /^Choose date/ }))
  },
  { name: 'dashboard-period-closed', ui: () => <Period /> },
  {
    name: 'dashboard-period-open',
    ui: () => <Period />,
    reach: () =>
      opened(screen.getByRole('button', { name: /^Choose dates, Period/ }))
  },
  { name: 'autocomplete-closed', ui: () => <City /> },
  {
    name: 'autocomplete-open',
    ui: () => <City />,
    reach: async () => {
      await userEvent.click(screen.getByRole('combobox', { name: 'City' }))
      await userEvent.keyboard('e')
      await screen.findByRole('option', { name: 'Adelaide' })
    }
  }
]

export function setUpCheckPage() {
  let removeStylesheets = () => {}
  beforeAll(async () => {
    const removeRoadie = useStylesheet(roadieCss)
    const removeStill = useStylesheet(STILL)
    removeStylesheets = () => {
      removeRoadie()
      removeStill()
    }
    await loadBrandFont()
  })
  afterAll(async () => {
    removeStylesheets()
    document.documentElement.classList.remove('dark')
    await page.viewport(1920, 1080)
  })
}

export async function showScenario(
  scenario: Scenario,
  theme: Theme,
  { width, height }: { width: number; height: number }
) {
  cleanup()
  await commands.parkPointer()
  await page.viewport(width, height)
  document.documentElement.classList.toggle('dark', theme === 'dark')
  render(
    <main className='grid min-h-full content-start bg-normal p-4 text-normal'>
      {scenario.ui()}
    </main>
  )
  await scenario.reach?.()
}

type KnownViolation = {
  rule: string
  /** Matches the offending element. */
  selector: string
  /** Set when only this engine reports it. */
  browser?: string
  ticket: string
}

// Serious and critical violations that already shipped. Each leaves once its
// ticket is fixed; anything not listed fails the check.
const knownViolations: KnownViolation[] = [
  {
    rule: 'aria-command-name',
    selector: '[data-base-ui-focus-guard]',
    browser: 'webkit',
    ticket: 'https://oztix.atlassian.net/browse/INNO-1184'
  }
]

const isKnown = (rule: string, { target }: NodeResult) =>
  knownViolations.some(
    (known) =>
      known.rule === rule &&
      (known.browser ?? server.browser) === server.browser &&
      document.querySelector(target.join(' '))?.matches(known.selector)
  )

export async function expectNoSeriousViolations() {
  const { violations } = await axe.run(document, {
    resultTypes: ['violations'],
    // Roadie measures contrast with APCA instead (docs/decisions/0010-apca-contrast.md).
    rules: { 'color-contrast': { enabled: false } }
  })
  const found = violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .flatMap(({ id, nodes }) =>
      nodes
        .filter((node) => !isKnown(id, node))
        .map(({ html, failureSummary }) => `${id}: ${html}\n${failureSummary}`)
    )
  expect(found).toEqual([])
}

type Role = keyof typeof minimumLc

// APCA's size bands: large from 24px or 16px bold, display from 36px or 24px
// bold.
function textRole(element: Element): Role {
  const { fontSize, fontWeight } = getComputedStyle(element)
  const size = parseFloat(fontSize)
  const bold = Number(fontWeight) >= 700
  if (element.closest('.emphasis-strong')) return 'label on a strong fill'
  if (size >= 36 || (bold && size >= 24)) return 'display text'
  if (size >= 24 || (bold && size >= 16)) return 'large text'
  return 'body text'
}

type Pair = {
  role: Role
  element: Element
  what: string
  colour: string
  /** A fill measured against what's under it, rather than painted on it. */
  isFill?: boolean
}

const isPainted = (colour: string) =>
  flatten('#000', colour).join() !== '0,0,0' ||
  flatten('#fff', colour).join() !== '255,255,255'

// Every element at the centre, in paint order. Call it inside
// withPointerEvents, since indicators and popups often turn them off.
function stackAt(element: Element) {
  const { left, top, width, height } = element.getBoundingClientRect()
  return document.elementsFromPoint(left + width / 2, top + height / 2)
}

// Forced once per measurement: toggling it per element restyles the page each
// time, which took WebKit past the test timeout.
function withPointerEvents<T>(measure: () => T) {
  const force = document.createElement('style')
  force.textContent = '* { pointer-events: auto !important }'
  document.head.append(force)
  try {
    return measure()
  } finally {
    force.remove()
  }
}

// The fill under an element as painted, including siblings such as a toggle
// group's indicator. Null when something opaque covers it, such as a modal
// backdrop.
function fillUnder({ element, isFill }: Pair) {
  const stack = stackAt(element)
  const at = stack.indexOf(element)
  if (at === -1) return null
  const above = stack.slice(0, at).filter((layer) => !element.contains(layer))
  if (above.some((layer) => isPainted(getComputedStyle(layer).backgroundColor)))
    return null
  const under = stack.slice(isFill ? at + 1 : at).reverse()
  return flatten(
    '#fff',
    ...under.map((layer) => getComputedStyle(layer).backgroundColor)
  )
}

// Disabled controls are exempt, and visually hidden text is never seen.
function isMeasured({ element }: Pair) {
  const { width, height } = element.getBoundingClientRect()
  return (
    width > 1 &&
    height > 1 &&
    element.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true
    }) &&
    !element.closest(':disabled, [aria-disabled="true"], [data-disabled]')
  )
}

function textPairs(): Pair[] {
  const owners = new Set<Element>()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent?.trim() && node.parentElement)
      owners.add(node.parentElement)
  }
  const pairs: Pair[] = [...owners].map((element) => ({
    role: textRole(element),
    element,
    what: `"${element.textContent?.trim().slice(0, 40)}"`,
    colour: getComputedStyle(element).color
  }))
  for (const input of document.querySelectorAll('input')) {
    const isPlaceholder = !input.value
    const text = input.value || input.placeholder
    if (!text) continue
    pairs.push({
      role: textRole(input),
      element: input,
      what: isPlaceholder ? `placeholder "${text}"` : `value "${text}"`,
      colour: getComputedStyle(input, isPlaceholder ? '::placeholder' : null)
        .color
    })
  }
  return pairs
}

// Icons, and the strong fills that mark a chosen state. A button's fill isn't
// measured, since its label identifies it.
function nonTextPairs(): Pair[] {
  const icons = [...document.querySelectorAll('svg')].map((element) => ({
    role: 'non-text UI' as const,
    element,
    what: 'icon',
    colour: getComputedStyle(element).color
  }))
  const chosen = document.querySelectorAll(
    '.emphasis-strong:is([data-selected], [data-slot$="indicator"])'
  )
  const fills = [...chosen].map((element) => ({
    role: 'non-text UI' as const,
    element,
    what: 'chosen fill',
    colour: getComputedStyle(element).backgroundColor,
    isFill: true
  }))
  return [...icons, ...fills]
}

export function measureContrast() {
  const pairs = [...textPairs(), ...nonTextPairs()].filter(isMeasured)
  return withPointerEvents(() =>
    pairs.flatMap((pair) => {
      const surface = fillUnder(pair)
      if (!surface) return []
      const lc = Math.abs(apcaLc(over(surface, pair.colour), surface))
      return [{ ...pair, lc }]
    })
  )
}

type KnownLowContrast = {
  role: Role
  matches: (pair: Pair) => boolean
  /** Just under the lowest Lc measured when listed, so a worse pair fails. */
  floor: number
  theme?: Theme
  ticket: string
  /** Set when the pair stays by decision: why it's accepted. */
  permanent?: string
}

// Pairs under their minimum that already shipped. Each leaves once its
// ticket is fixed, unless it's permanent; anything not listed fails the check.
const knownLowContrast: KnownLowContrast[] = [
  {
    role: 'non-text UI',
    matches: ({ element }) =>
      element.matches('.intent-accent') &&
      element.closest('button[data-date]') !== null,
    floor: 35,
    theme: 'dark',
    ticket: 'https://oztix.atlassian.net/browse/INNO-1198',
    // Lc 38.9 on the dark popover and 40.1 on the page, for the accent strong
    // fill of a chosen day.
    permanent:
      "The chosen day's white semibold label carries the selected state. A search of the sRGB gamut found no fill that reaches Lc 45 against the dark surfaces with a white label at Lc 60 or more; the best was about 44.8 and 59.8."
  }
]

const isKnownLow = (pair: Pair & { lc: number }) =>
  knownLowContrast.some(
    (known) =>
      known.role === pair.role &&
      pair.lc >= known.floor &&
      (known.theme ?? currentTheme()) === currentTheme() &&
      known.matches(pair)
  )

const currentTheme = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light'

export function expectApcaContrast() {
  const failures = measureContrast()
    .filter((pair) => pair.lc < minimumLc[pair.role] && !isKnownLow(pair))
    .map(
      ({ role, element, what, lc }) =>
        `${role} needs Lc ${minimumLc[role]}, has ${lc.toFixed(1)}: ${what} in ${element.outerHTML.slice(0, 120)}`
    )
  expect(failures).toEqual([])
}
