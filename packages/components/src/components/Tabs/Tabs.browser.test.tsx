import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Tabs } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { apcaLc, minimumLc, shownFill } from '../../css/contrastTestUtils'
import { useStylesheet } from '../Pane/testUtils'
import type { TabsRootEmphasis, TabsRootSize } from './variants'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

const SIZES: TabsRootSize[] = ['sm', 'md', 'lg']
const EMPHASES: TabsRootEmphasis[] = ['strong', 'normal', 'subtle', 'subtler']
const TEXT_TAB_WIDTH_PADDING = { sm: 24, md: 32, lg: 40 }

function ViewTabs({
  size,
  emphasis
}: {
  size?: TabsRootSize
  emphasis?: TabsRootEmphasis
}) {
  return (
    <Tabs defaultValue='chart' size={size} emphasis={emphasis}>
      <Tabs.List aria-label='View'>
        <Tabs.Tab value='chart' aria-label='Chart'>
          <svg className='size-4' viewBox='0 0 16 16' />
        </Tabs.Tab>
        <Tabs.Tab value='table' aria-label='Table'>
          <svg className='size-4' viewBox='0 0 16 16' />
        </Tabs.Tab>
        <Tabs.Tab value='summary'>Summary</Tabs.Tab>
        <Tabs.Indicator />
      </Tabs.List>
    </Tabs>
  )
}

const rectOf = (name: string) =>
  screen.getByRole('tab', { name }).getBoundingClientRect()

const indicator = () =>
  document.querySelector<HTMLElement>('[data-slot="tabs-indicator"]')!

describe.each(SIZES)('an icon-only tab at size %s', (size) => {
  it('is square, with the icon centred', () => {
    render(<ViewTabs size={size} />)
    const tab = rectOf('Chart')
    expect(Math.abs(tab.width - tab.height)).toBeLessThanOrEqual(0.5)
    const icon = screen
      .getByRole('tab', { name: 'Chart' })
      .querySelector('svg')!
      .getBoundingClientRect()
    expect(
      Math.abs(icon.left + icon.width / 2 - (tab.left + tab.width / 2))
    ).toBeLessThanOrEqual(0.5)
  })

  it('leaves a text tab padded as before', () => {
    render(<ViewTabs size={size} />)
    const tab = screen.getByRole('tab', { name: 'Summary' })
    const text = document.createRange()
    text.selectNodeContents(tab)
    const { width } = tab.getBoundingClientRect()
    expect(width - text.getBoundingClientRect().width).toBeCloseTo(
      TEXT_TAB_WIDTH_PADDING[size],
      0
    )
  })
})

describe.each(EMPHASES)('the %s indicator on an icon-only tab', (emphasis) => {
  it('matches the tab', async () => {
    render(<ViewTabs emphasis={emphasis} />)
    const tab = rectOf('Chart')
    await expect
      .poll(() =>
        Math.abs(indicator().getBoundingClientRect().width - tab.width)
      )
      .toBeLessThanOrEqual(0.5)
    if (emphasis === 'subtler') return
    const bar = indicator().getBoundingClientRect()
    expect(Math.abs(bar.height - tab.height)).toBeLessThanOrEqual(0.5)
    const radius = parseFloat(getComputedStyle(indicator()).borderTopLeftRadius)
    expect(radius).toBeGreaterThanOrEqual(tab.height / 2)
  })
})

it('stays square when the list is too narrow for every tab', () => {
  render(
    <div style={{ width: 80 }}>
      <ViewTabs size='md' />
    </div>
  )
  const tab = rectOf('Chart')
  expect(Math.abs(tab.width - tab.height)).toBeLessThanOrEqual(0.5)
})

it('centres the icon in a vertical list', () => {
  render(
    <Tabs defaultValue='chart' direction='vertical'>
      <Tabs.List aria-label='View'>
        <Tabs.Tab value='chart' aria-label='Chart'>
          <svg className='size-4' viewBox='0 0 16 16' />
        </Tabs.Tab>
        <Tabs.Tab value='table' aria-label='Table'>
          <svg className='size-4' viewBox='0 0 16 16' />
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  )
  const tab = rectOf('Chart')
  const icon = screen
    .getByRole('tab', { name: 'Chart' })
    .querySelector('svg')!
    .getBoundingClientRect()
  expect(Math.abs(tab.width - tab.height)).toBeLessThanOrEqual(0.5)
  expect(
    Math.abs(icon.left + icon.width / 2 - (tab.left + tab.width / 2))
  ).toBeLessThanOrEqual(0.5)
})

describe('the subtler underline', () => {
  it.each([
    ['light', false],
    ['dark', true]
  ] as const)('stands apart from the page in %s mode', (_mode, dark) => {
    document.documentElement.classList.toggle('dark', dark)
    render(
      <div data-surface className='bg-normal p-4'>
        <ViewTabs emphasis='subtler' />
      </div>
    )
    const surface = shownFill(document.querySelector('[data-surface]')!)
    expect(
      Math.abs(apcaLc(shownFill(indicator()), surface))
    ).toBeGreaterThanOrEqual(minimumLc['non-text UI'])
  })

  it('draws its focus ring inside the tab, where the list would clip it', async () => {
    render(<ViewTabs emphasis='subtler' />)
    await userEvent.tab()
    const tab = screen.getByRole('tab', { name: 'Chart' })
    expect(tab).toHaveFocus()

    await expect
      .poll(() => {
        const { outlineWidth, outlineOffset } = getComputedStyle(tab)
        return [outlineWidth, outlineOffset]
      })
      .toEqual(['4px', '-4px'])
  })

  it('takes the Highlight colour under forced colours', async (context) => {
    render(
      <div className='p-4'>
        <ViewTabs emphasis='subtler' />
        <span data-probe style={{ background: 'Highlight' }} />
      </div>
    )
    await commands.forcedColors(true)
    onTestFinished(() => commands.forcedColors(false))
    if (!matchMedia('(forced-colors: active)').matches) {
      context.skip()
      return
    }
    const highlight = getComputedStyle(
      document.querySelector('[data-probe]')!
    ).backgroundColor
    await expect
      .poll(() => getComputedStyle(indicator()).backgroundColor)
      .toBe(highlight)
  })
})

describe('a list too narrow for its tabs', () => {
  function EventTabs({ value, width }: { value: string; width: number }) {
    return (
      <div style={{ width }}>
        <Tabs value={value}>
          <Tabs.List aria-label='Event'>
            <Tabs.Tab value='overview'>Overview</Tabs.Tab>
            <Tabs.Tab value='tickets'>Tickets</Tabs.Tab>
            <Tabs.Tab value='history'>History</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </div>
    )
  }

  // WebKit scrolls by whole pixels, so a tab can sit a fraction past the edge.
  const inView = (name: string) => {
    const list = screen.getByRole('tablist').getBoundingClientRect()
    const tab = rectOf(name)
    return tab.left >= list.left - 1 && tab.right <= list.right + 1
  }

  it('scrolls sideways to show a newly active tab', async () => {
    const { rerender } = render(<EventTabs value='overview' width={160} />)
    expect(inView('History')).toBe(false)

    rerender(<EventTabs value='history' width={160} />)
    await expect.poll(() => inView('History')).toBe(true)
  })

  it('keeps the active tab in view as the list narrows', async () => {
    const { rerender } = render(<EventTabs value='history' width={600} />)
    expect(inView('History')).toBe(true)

    rerender(<EventTabs value='history' width={160} />)
    await expect.poll(() => inView('History')).toBe(true)
  })
})
