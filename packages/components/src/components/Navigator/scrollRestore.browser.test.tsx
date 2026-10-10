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

function Docs({ value }: { value: string }) {
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
          <div style={{ height: 4000 }}>{value}</div>
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
async function scrollTo(top: number) {
  scroller().scrollTop = top
  scroller().dispatchEvent(new Event('scroll'))
  await frames()
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
  }
)
