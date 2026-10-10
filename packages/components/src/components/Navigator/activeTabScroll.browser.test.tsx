import { cleanup, render, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
import { useStylesheet } from '../Pane/testUtils'
import { withStubLink } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(async () => {
  cleanup()
  forgetPaneScroll()
  await commands.reduceMotion(false)
})

const frames = (count = 4) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

async function settle() {
  await frames()
  for (const animation of document.getAnimations()) animation.finish()
  await frames()
}

const components = Array.from({ length: 40 }, (_, i) => `/components/${i}`)

function Docs({ value }: { value: string }) {
  return withStubLink(
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value={value} onValueChange={vi.fn()}>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/' href='/'>
            Home
            <Navigator.Secondary aria-label='Home pages' overview>
              <Navigator.Item
                value='/overview/philosophy'
                href='/overview/philosophy'
              >
                Philosophy
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='/components' href='/components'>
            Components
            <Navigator.Secondary aria-label='Components'>
              {components.map((path) => (
                <Navigator.Item key={path} value={path} href={path}>
                  {path}
                </Navigator.Item>
              ))}
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Pane>
          <Pane.Header />
          <div style={{ height: 4000 }}>Content</div>
        </Pane>
      </Navigator>
    </div>
  )
}

const topPane = () =>
  document.querySelector<HTMLElement>(
    '[data-stack-position="top"] [data-slot="pane-viewport"]'
  )!

async function scrollDown(scroller: HTMLElement) {
  scroller.scrollTop = 400
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
}

describe('tapping the active tab of a collapsed bar on its own route', () => {
  it.each([
    ['its overview', '/', 'Home', false],
    ['its list', '/components', 'Components', false],
    ['its overview with reduced motion', '/', 'Home', true],
    ['its list with reduced motion', '/components', 'Components', true]
  ])(
    'on %s scrolls the pane back to the top',
    async (_, value, name, reduced) => {
      await commands.reduceMotion(reduced)
      render(<Docs value={value} />)
      await settle()
      const bar = document.querySelector<HTMLElement>(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )!
      const scroller = topPane()
      await scrollDown(scroller)
      expect(bar).toHaveAttribute('data-collapsed', 'true')

      await userEvent.click(within(bar).getByRole('link', { name }))

      await expect.poll(() => scroller.scrollTop).toBe(0)
      expect(bar).toHaveAttribute('data-collapsed', 'false')
    }
  )
})

const destinations = Array.from({ length: 40 }, (_, i) => `Destination ${i}`)

describe('tapping More again', () => {
  it.each([
    ['a phone', 390, 844, 'horizontal', false],
    ['a desktop', 1400, 400, 'vertical', false],
    ['a phone with reduced motion', 390, 844, 'horizontal', true],
    ['a desktop with reduced motion', 1400, 400, 'vertical', true]
  ])(
    'on %s scrolls More back to the top',
    async (_, width, height, orientation, reduced) => {
      await page.viewport(width, height)
      onTestFinished(() => page.viewport(390, 844))
      await commands.reduceMotion(reduced)
      render(
        <div style={{ height: '100vh', display: 'grid' }}>
          <Navigator value={destinations[0]} onValueChange={vi.fn()}>
            <Navigator.Primary aria-label='Primary'>
              {destinations.map((destination) => (
                <Navigator.Item key={destination} value={destination}>
                  {destination}
                </Navigator.Item>
              ))}
            </Navigator.Primary>
            <Pane>
              <Pane.Header />
              <div style={{ height: 4000 }}>Content</div>
            </Pane>
          </Navigator>
        </div>
      )
      await settle()
      const primary = document.querySelector<HTMLElement>(
        `[data-slot="navigator-primary"][data-orientation="${orientation}"]`
      )!
      const more = within(primary).getByRole('button', { name: 'More' })
      await userEvent.click(more)
      await settle()
      const scroller = topPane()
      await scrollDown(scroller)
      expect(scroller.scrollTop).toBeGreaterThan(0)

      await userEvent.click(more)

      await expect.poll(() => scroller.scrollTop).toBe(0)
    }
  )
})
