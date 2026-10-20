import type { ReactNode } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import { Tabs } from '../components/Tabs'
import {
  apcaLc,
  flatten,
  minimumLc,
  oklchLightness,
  shownFill
} from './contrastTestUtils'

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
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
] as const

const MIN_SUBTLE_GAP_ON_PAGE = 0.06
const MIN_SUBTLE_GAP_ON_RAISED = 0.045
const MIN_SUBTLER_GAP = 0.03

const surfaces: [string, (children: ReactNode) => ReactNode][] = [
  ['the page', (children) => <div className='bg-normal p-4'>{children}</div>],
  [
    'a raised surface',
    (children) => <div className='emphasis-raised p-4'>{children}</div>
  ],
  [
    'a floating surface',
    (children) => <div className='emphasis-floating p-4'>{children}</div>
  ]
]

const lightness = (element: Element) => oklchLightness(shownFill(element))
const byId = (id: string) => screen.getByTestId(id)

function gapToItsSurface(id: string) {
  const element = byId(id)
  return lightness(element) - lightness(element.parentElement!)
}

function subtleTextLc(id: string) {
  const element = byId(id)
  const text = flatten(getComputedStyle(element.firstElementChild!).color)
  return Math.abs(apcaLc(text, shownFill(element)))
}

function tints(intent: string) {
  return (
    <>
      <div data-testid='subtle' className={`emphasis-subtle intent-${intent}`}>
        <span className='text-subtle'>Sold out</span>
      </div>
      <div
        data-testid='subtler'
        className={`emphasis-subtler intent-${intent}`}
      />
    </>
  )
}

describe.each(INTENTS)('a %s subtle tint in dark mode', (intent) => {
  it('stands off the page', () => {
    document.documentElement.classList.add('dark')
    render(surfaces[0]![1](tints(intent)))
    expect(gapToItsSurface('subtle')).toBeGreaterThanOrEqual(
      MIN_SUBTLE_GAP_ON_PAGE
    )
  })

  it('stands off a raised surface', () => {
    document.documentElement.classList.add('dark')
    render(surfaces[1]![1](tints(intent)))
    expect(gapToItsSurface('subtle')).toBeGreaterThanOrEqual(
      MIN_SUBTLE_GAP_ON_RAISED
    )
  })

  it('keeps subtler quieter than subtle, and still visible', () => {
    document.documentElement.classList.add('dark')
    render(surfaces[0]![1](tints(intent)))
    const subtler = gapToItsSurface('subtler')
    expect(subtler).toBeGreaterThanOrEqual(MIN_SUBTLER_GAP)
    expect(subtler).toBeLessThan(gapToItsSurface('subtle'))
  })

  it.each(surfaces)('keeps subtle text readable on %s', (_, on) => {
    document.documentElement.classList.add('dark')
    render(on(tints(intent)))
    expect(subtleTextLc('subtle')).toBeGreaterThanOrEqual(
      minimumLc['body text']
    )
  })
})

describe('a subtle tint that inherits its intent in dark mode', () => {
  it('stands off the page', () => {
    document.documentElement.classList.add('dark')
    render(
      <div className='bg-normal p-4'>
        <div data-testid='subtle' className='emphasis-subtle' />
      </div>
    )
    expect(gapToItsSurface('subtle')).toBeGreaterThanOrEqual(
      MIN_SUBTLE_GAP_ON_PAGE
    )
  })
})

describe('an interactive subtle surface in dark mode', () => {
  it('lightens on hover', async () => {
    document.documentElement.classList.add('dark')
    render(
      <div className='bg-normal p-4'>
        <button
          type='button'
          data-testid='subtle'
          className='is-interactive emphasis-subtle'
        >
          Filter
        </button>
      </div>
    )
    const rest = lightness(byId('subtle'))
    await userEvent.hover(byId('subtle'))
    expect(lightness(byId('subtle')) - rest).toBeGreaterThanOrEqual(0.015)
  })
})

describe('the subtle Tabs pill in dark mode', () => {
  it('stands off the page', async () => {
    document.documentElement.classList.add('dark')
    render(
      <div className='bg-normal p-4'>
        <Tabs defaultValue='week' emphasis='subtle'>
          <Tabs.List>
            <Tabs.Tab value='day'>Day</Tabs.Tab>
            <Tabs.Tab value='week'>Week</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
        </Tabs>
      </div>
    )
    const pill = await expect
      .poll(() => document.querySelector('[data-slot="tabs-indicator"]'))
      .toBeTruthy()
      .then(() => document.querySelector('[data-slot="tabs-indicator"]')!)
    const list = document.querySelector('[data-slot="tabs-list"]')!
    expect(lightness(pill) - lightness(list)).toBeGreaterThanOrEqual(
      MIN_SUBTLE_GAP_ON_PAGE
    )
  })
})

describe('subtle text in a nested intent in dark mode', () => {
  it.each(surfaces.slice(1))(
    'brightens with the surface it sits on, %s',
    (_, on) => {
      document.documentElement.classList.add('dark')
      render(
        on(
          <p data-testid='nested' className='text-subtle intent-warning'>
            Few left
          </p>
        )
      )
      const probe = document.createElement('span')
      probe.style.color =
        'color-mix(in oklch, var(--color-warning-12) 40%, var(--color-warning-11))'
      document.body.append(probe)
      const expected = getComputedStyle(probe).color
      probe.remove()
      expect(getComputedStyle(byId('nested')).color).toBe(expected)
    }
  )
})

describe('subtle tints in light mode', () => {
  function colourOf(background: string) {
    const probe = document.createElement('span')
    probe.style.backgroundColor = background
    document.body.append(probe)
    const colour = getComputedStyle(probe).backgroundColor
    probe.remove()
    return colour
  }

  it.each(INTENTS)('keeps %s subtle at 11% and subtler at 6%', (intent) => {
    render(tints(intent))
    const scale = intent === 'brand-purple' ? 'info' : intent
    const step9 = `var(--color-${scale}-9)`
    expect(getComputedStyle(byId('subtle')).backgroundColor).toBe(
      colourOf(`color-mix(in oklch, ${step9} 11%, transparent)`)
    )
    expect(getComputedStyle(byId('subtler')).backgroundColor).toBe(
      colourOf(`color-mix(in oklch, ${step9} 6%, transparent)`)
    )
  })
})
