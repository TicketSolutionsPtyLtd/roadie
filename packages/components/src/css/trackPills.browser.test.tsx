import type { ReactNode } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import { Tabs } from '../components/Tabs'
import { ToggleGroup } from '../components/ToggleGroup'
import { oklchLightness, shownFill } from './contrastTestUtils'

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

// As far as raised stands off the page in dark mode.
const MIN_PILL_GAP = 0.07
// Light neutral step 9 at 11%, and step 1, at the default accent hue.
const LIGHT_TRACK_TINT = 'oklch(0.645 0.039 247 / 0.11)'
const LIGHT_PILL_FILL = 'oklch(0.991 0.004 247)'

const lightness = (element: Element) => oklchLightness(shownFill(element))

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`)!

function tabs() {
  return (
    <Tabs defaultValue='overview'>
      <Tabs.List>
        <Tabs.Tab value='overview'>Overview</Tabs.Tab>
        <Tabs.Tab value='details'>Details</Tabs.Tab>
        <Tabs.Indicator />
      </Tabs.List>
    </Tabs>
  )
}

function toggleGroup() {
  return (
    <ToggleGroup aria-label='Date range' defaultValue={['30d']}>
      <ToggleGroup.Item value='7d'>7 days</ToggleGroup.Item>
      <ToggleGroup.Item value='30d'>30 days</ToggleGroup.Item>
    </ToggleGroup>
  )
}

const surfaces: [string, (children: ReactNode) => ReactNode][] = [
  ['the page', (children) => <div className='bg-normal p-4'>{children}</div>],
  [
    'a raised pane',
    (children) => <div className='emphasis-raised p-4'>{children}</div>
  ]
]

describe.each(surfaces)('in dark mode on %s', (_, on) => {
  it('picks out the chosen tab from its track', async () => {
    document.documentElement.classList.add('dark')
    render(on(tabs()))
    await expect.poll(() => slot('tabs-indicator')).toBeTruthy()
    const gap = lightness(slot('tabs-indicator')) - lightness(slot('tabs-list'))
    expect(gap).toBeGreaterThanOrEqual(MIN_PILL_GAP)
  })

  it('picks out the pressed toggle from its track', async () => {
    document.documentElement.classList.add('dark')
    render(on(toggleGroup()))
    await expect.poll(() => slot('toggle-group-indicator')).toBeTruthy()
    const gap =
      lightness(slot('toggle-group-indicator')) -
      lightness(slot('toggle-group'))
    expect(gap).toBeGreaterThanOrEqual(MIN_PILL_GAP)
  })
})

function colourOf(background: string) {
  const probe = document.createElement('span')
  probe.style.backgroundColor = background
  document.body.append(probe)
  const colour = getComputedStyle(probe).backgroundColor
  probe.remove()
  return colour
}

describe('in light mode', () => {
  it('keeps the tab track on the subtle tint', async () => {
    render(<div className='bg-normal p-4'>{tabs()}</div>)
    await expect.poll(() => slot('tabs-indicator')).toBeTruthy()
    expect(getComputedStyle(slot('tabs-list')).backgroundColor).toBe(
      colourOf(LIGHT_TRACK_TINT)
    )
  })

  it('keeps the chosen tab on the raised fill', async () => {
    render(<div className='bg-normal p-4'>{tabs()}</div>)
    await expect.poll(() => slot('tabs-indicator')).toBeTruthy()
    expect(getComputedStyle(slot('tabs-indicator')).backgroundColor).toBe(
      colourOf(LIGHT_PILL_FILL)
    )
  })
})
