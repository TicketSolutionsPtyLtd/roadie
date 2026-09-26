import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Tabs } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import type { TabsRootEmphasis, TabsRootSize } from './variants'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

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
