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
import { page, userEvent } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
import { useStylesheet } from '../Pane/testUtils'
import { withStubLink } from './testUtils'

type Traversable = {
  back: () => { finished: Promise<unknown> }
  forward: () => { finished: Promise<unknown> }
}
const navigation = (window as { navigation?: Traversable }).navigation

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  forgetPaneScroll()
})

const frames = (count = 4) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

function Docs({ value, query = '' }: { value: string; query?: string }) {
  return withStubLink(
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value={value} onValueChange={vi.fn()}>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/a' href='/a'>
            A
            <Navigator.Secondary aria-label='A pages' overview>
              <Navigator.Item value='/a/1' href='/a/1'>
                A1
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='/b' href='/b'>
            B
          </Navigator.Item>
        </Navigator.Primary>
        <Pane>
          <Pane.Header />
          <div style={{ height: 4000 }}>
            {value}
            {query}
          </div>
        </Pane>
      </Navigator>
    </div>
  )
}

const scroller = () =>
  document.querySelector<HTMLElement>(
    '[data-stack-position="top"] [data-slot="pane-viewport"]'
  )!

// The pane files its place a frame after the scroll event.
async function scrollTo(top: number, viewport = scroller()) {
  viewport.scrollTop = top
  viewport.dispatchEvent(new Event('scroll'))
  await frames()
}

async function settle() {
  await frames()
  for (const animation of document.getAnimations()) animation.finish()
  await frames()
}

// History moves while the pane renders nothing, as a layout's pane does when its page changes the query.
async function scrollOnAnotherEntry(top: number, viewport: HTMLElement) {
  history.pushState(null, '', '?step=2')
  await scrollTo(top, viewport)
  await navigation!.back().finished
}

const folded = Array.from({ length: 12 }, (_, i) => `/${i}`)

function Folded() {
  return (
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value='/0' onValueChange={vi.fn()}>
        <Navigator.Primary aria-label='Primary'>
          {folded.map((value) => (
            <Navigator.Item key={value} value={value}>
              {value}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
        <Pane>
          <Pane.Header />
          <div style={{ height: 4000 }}>Page</div>
        </Pane>
      </Navigator>
    </div>
  )
}

function Shows({ reached }: { reached: boolean }) {
  return (
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value='/shows'>
        <Pane column='list'>
          <Pane.Header />
          <div style={{ height: 4000 }}>Shows</div>
        </Pane>
        <Pane reached={reached}>
          <Pane.Header onBack={() => {}} />
          <div style={{ height: 4000 }}>Show</div>
        </Pane>
      </Navigator>
    </div>
  )
}

describe.skipIf(navigation === undefined)(
  'going back and forward through real history entries',
  () => {
    it.each([
      ['a phone', 390, 844],
      ['a desktop', 1400, 900]
    ])('on %s puts the pane where it was', async (_, width, height) => {
      await page.viewport(width, height)
      onTestFinished(() => page.viewport(1920, 1080))
      const { rerender } = render(<Docs value='/a' />)
      await frames()
      await scrollTo(600)

      history.pushState(null, '', location.href)
      rerender(<Docs value='/b' />)
      await frames()
      expect(scroller().scrollTop).toBe(0)
      await scrollTo(300)

      await navigation!.back().finished
      rerender(<Docs value='/a' />)
      await expect.poll(() => scroller().scrollTop).toBe(600)

      await navigation!.forward().finished
      rerender(<Docs value='/b' />)
      await expect.poll(() => scroller().scrollTop).toBe(300)
    })

    it('still scrolls to the top when the collapsed active tab is tapped after going back', async () => {
      await page.viewport(390, 844)
      onTestFinished(() => page.viewport(1920, 1080))
      const { rerender } = render(<Docs value='/a' />)
      await frames()
      await scrollTo(600)
      history.pushState(null, '', location.href)
      rerender(<Docs value='/b' />)
      await frames()
      await navigation!.back().finished
      rerender(<Docs value='/a' />)
      await expect.poll(() => scroller().scrollTop).toBe(600)

      const bar = document.querySelector<HTMLElement>(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )!
      await expect.poll(() => bar.getAttribute('data-collapsed')).toBe('true')
      await userEvent.click(within(bar).getByRole('link', { name: 'A' }))

      await expect.poll(() => scroller().scrollTop).toBe(0)
    })

    it('puts each entry of a query-only change back where it was', async () => {
      const { rerender } = render(<Docs value='/a' />)
      await frames()
      await scrollTo(600)

      history.pushState(null, '', '?page=2')
      rerender(<Docs value='/a' query='?page=2' />)
      await frames()
      await scrollTo(300)

      await navigation!.back().finished
      rerender(<Docs value='/a' />)
      await expect.poll(() => scroller().scrollTop).toBe(600)

      await navigation!.forward().finished
      rerender(<Docs value='/a' query='?page=2' />)
      await expect.poll(() => scroller().scrollTop).toBe(300)
    })

    it('on a resize that closes More puts the pane back in its own seat', async () => {
      await page.viewport(390, 844)
      onTestFinished(() => page.viewport(1920, 1080))
      render(<Folded />)
      await settle()
      const pane = scroller()
      await scrollTo(600, pane)
      await scrollOnAnotherEntry(200, pane)
      const bar = document.querySelector<HTMLElement>(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )!
      await userEvent.click(within(bar).getByRole('button', { name: 'More' }))
      await settle()

      await page.viewport(1400, 900)

      await expect.poll(() => pane.scrollTop).toBe(600)
    })

    it('puts a pane returning from behind where its entry left it', async () => {
      await page.viewport(1400, 900)
      onTestFinished(() => page.viewport(1920, 1080))
      const { rerender } = render(<Shows reached />)
      await settle()
      const list = document.querySelector<HTMLElement>(
        '[data-column="list"] [data-slot="pane-viewport"]'
      )!
      await scrollTo(600, list)
      await scrollOnAnotherEntry(200, list)

      rerender(<Shows reached={false} />)

      await expect.poll(() => list.scrollTop).toBe(600)
    })
  }
)
