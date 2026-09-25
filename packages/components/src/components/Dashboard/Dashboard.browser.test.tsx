import { cleanup, render } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  CARD_SIZES,
  CARD_SPANS,
  DASHBOARD_TRACKS,
  type DashboardWidth
} from '@oztix/roadie-core/dashboard-layout'

import { Dashboard } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { DataCard } from '../DataCard'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const WIDTH_PX: Record<DashboardWidth, number> = {
  desktop: 1200,
  tablet: 720,
  phone: 360
}

const spanCount = (value: string) => Number(value.match(/span (\d+)/)?.[1])

describe('Dashboard grid', () => {
  for (const [width, px] of Object.entries(WIDTH_PX) as [
    DashboardWidth,
    number
  ][])
    it(`matches CARD_SPANS on ${width}`, () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { container } = render(
        <div style={{ width: px }}>
          <Dashboard>
            <Dashboard.Section title='Sizes'>
              {CARD_SIZES.map((size) => (
                <DataCard key={size} label={size} size={size} value={1} />
              ))}
            </Dashboard.Section>
          </Dashboard>
        </div>
      )
      const grid = container.querySelector<HTMLElement>(
        '[data-slot=dashboard-grid]'
      )!
      const tracks =
        getComputedStyle(grid).gridTemplateColumns.split(' ').length
      expect(tracks).toBe(DASHBOARD_TRACKS[width])
      for (const card of grid.querySelectorAll<HTMLElement>(
        '[data-slot=data-card]'
      ))
        expect(spanCount(getComputedStyle(card).gridColumn)).toBe(
          CARD_SPANS[card.dataset.size as keyof typeof CARD_SPANS][width]
        )
      warn.mockRestore()
    })

  it('stretches cards in a row to equal height', () => {
    const { container } = render(
      <div style={{ width: 1200 }}>
        <Dashboard>
          <Dashboard.Section title='Row'>
            <DataCard label='Short' size='md' value={1} />
            <DataCard label='Tall' size='md' value={2}>
              <div style={{ height: 200 }} />
            </DataCard>
          </Dashboard.Section>
        </Dashboard>
      </div>
    )
    const [a, b] = [...container.querySelectorAll('[data-slot=data-card]')].map(
      (el) => el.getBoundingClientRect().height
    )
    expect(a).toBe(b)
  })
})
