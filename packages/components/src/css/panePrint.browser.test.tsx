import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Button } from '../components/Button'
import { Navigator } from '../components/Navigator'
import { FakeIcon, withStubLink } from '../components/Navigator/testUtils'
import { Pane } from '../components/Pane'
import { useStylesheet } from '../components/Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  await commands.printMedia(false)
  cleanup()
  document.body.innerHTML = ''
})

const frames = (count = 4) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`)

/** Whether the element takes up any room on the page. */
const laidOut = (element: HTMLElement | null) =>
  element !== null &&
  element.getClientRects().length > 0 &&
  getComputedStyle(element).visibility === 'visible'

// Taller than any screen the tests run at, so a clip would show.
const Invoice = () => (
  <div data-testid='invoice' className='grid gap-4'>
    {Array.from({ length: 60 }, (_, line) => (
      <p key={line}>Line {line + 1}: Kazoo Hollow Room, general admission</p>
    ))}
  </div>
)

function Frame() {
  return (
    <Navigator value='/orders'>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/shows' href='/shows' icon={<FakeIcon />}>
          Shows
        </Navigator.Item>
        <Navigator.Item value='/orders' href='/orders' icon={<FakeIcon />}>
          Orders
        </Navigator.Item>
      </Navigator.Primary>
      <Pane column='list' data-testid='list'>
        <Pane.Header>
          <Pane.Title>Orders</Pane.Title>
        </Pane.Header>
        <p>Order 1042</p>
      </Pane>
      <Pane data-testid='detail'>
        <Pane.Header onBack={() => {}}>
          <Pane.Title>Order 1042</Pane.Title>
          <Pane.Actions>
            <Button>Refund</Button>
          </Pane.Actions>
        </Pane.Header>
        <Invoice />
        <Pane.Footer>
          <Button>Resend tickets</Button>
        </Pane.Footer>
      </Pane>
    </Navigator>
  )
}

function host(width: number) {
  const element = document.createElement('div')
  element.style.width = `${width}px`
  document.body.append(element)
  return element
}

const byTestId = (id: string) =>
  document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!

describe.each([600, 1400])('printing a Navigator at %ipx', (width) => {
  async function print() {
    render(withStubLink(<Frame />), { container: host(width) })
    await frames()
    await commands.printMedia(true)
    await frames()
  }

  it('lays out the top pane and leaves the frame’s chrome off the page', async () => {
    await print()
    expect(laidOut(byTestId('detail'))).toBe(true)
    expect(laidOut(byTestId('list'))).toBe(false)
    for (const name of [
      'navigator-primary',
      'pane-actions',
      'pane-footer',
      'pane-back',
      'scroll-area-scrollbar'
    ])
      for (const element of document.querySelectorAll<HTMLElement>(
        `[data-slot="${name}"]`
      ))
        expect(laidOut(element), name).toBe(false)
  })

  it('prints the whole pane, not one screen of it', async () => {
    await print()
    const detail = byTestId('detail')
    const invoice = byTestId('invoice')
    const viewport = slot('pane-viewport', detail)!
    expect(invoice.getBoundingClientRect().height).toBeGreaterThan(
      window.innerHeight
    )
    // Nothing clips it: the pane and the frame are as tall as what they hold.
    expect(viewport.scrollHeight).toBe(viewport.clientHeight)
    expect(detail.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
      invoice.getBoundingClientRect().bottom
    )
    const navigator = slot('navigator')!
    expect(navigator.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
      invoice.getBoundingClientRect().bottom
    )
    // On the page, from its left edge: no gutter, inset, or slide left over.
    expect(Math.round(detail.getBoundingClientRect().left)).toBe(
      Math.round(navigator.getBoundingClientRect().left)
    )
    expect(Math.round(detail.getBoundingClientRect().top)).toBe(
      Math.round(navigator.getBoundingClientRect().top)
    )
    for (const element of [navigator, detail, viewport])
      expect(getComputedStyle(element).overflowY, element.dataset.slot).toBe(
        'visible'
      )
  })

  it('prints the title above the content, in the flow', async () => {
    await print()
    const detail = byTestId('detail')
    const title = slot('pane-header', detail)!
    expect(laidOut(title)).toBe(true)
    expect(getComputedStyle(title).position).not.toBe('sticky')
    expect(title.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      byTestId('invoice').getBoundingClientRect().top
    )
  })

  it('leaves the screen layout alone', async () => {
    render(withStubLink(<Frame />), { container: host(width) })
    await frames()
    const navigator = slot('navigator')!
    expect(getComputedStyle(navigator).overflowY).toBe('clip')
    expect(navigator.getBoundingClientRect().height).toBe(window.innerHeight)
  })
})

describe('printing a Pane outside a Navigator', () => {
  it('prints the whole pane', async () => {
    render(
      <div className='h-80'>
        <Pane data-testid='alone' className='h-full'>
          <Pane.Header>
            <Pane.Title>Tax invoice</Pane.Title>
          </Pane.Header>
          <Invoice />
        </Pane>
      </div>,
      { container: host(800) }
    )
    await frames()
    await commands.printMedia(true)
    await frames()
    const pane = byTestId('alone')
    const viewport = slot('pane-viewport', pane)!
    expect(viewport.scrollHeight).toBe(viewport.clientHeight)
    expect(pane.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
      byTestId('invoice').getBoundingClientRect().bottom
    )
  })
})
