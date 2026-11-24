import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Button } from '../components/Button'
import { Navigator } from '../components/Navigator'
import { FakeIcon, withStubLink } from '../components/Navigator/testUtils'
import { Pane } from '../components/Pane'
import {
  type RowSpec,
  contentMarkup,
  mount,
  rowMarkup,
  useStylesheet
} from '../components/Pane/testUtils'
import {
  paneHeaderVariants,
  paneTitleCompactVariants,
  paneTitleVariants
} from '../components/Pane/variants'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
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
const laidOut = (element: HTMLElement | null | undefined) =>
  element != null &&
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
      <Pane data-testid='detail' emphasis='normal'>
        <Pane.Header onBack={() => {}}>
          <Pane.Title>Order 1042</Pane.Title>
          <Pane.Actions>
            <Button>Refund</Button>
          </Pane.Actions>
          <Pane.Search value='' onValueChange={() => {}} />
        </Pane.Header>
        <Invoice />
        <Pane.Footer>
          <Button>Resend tickets</Button>
        </Pane.Footer>
      </Pane>
      <Pane column='inspector' data-testid='inspector'>
        <p>Payment history</p>
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
  // A phone's frame clears a floating tab bar, which paper has no use for.
  beforeAll(() => page.viewport(width, 900))

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
    expect(laidOut(byTestId('inspector'))).toBe(false)
    for (const name of [
      'navigator-primary',
      'pane-actions',
      'pane-search',
      'pane-footer',
      'pane-back',
      'pane-close',
      'scroll-area-scrollbar'
    ])
      for (const element of document.querySelectorAll<HTMLElement>(
        `[data-slot="${name}"]`
      ))
        expect(laidOut(element), name).toBe(false)
    const viewport = slot('pane-viewport', byTestId('detail'))!
    expect(getComputedStyle(viewport).paddingBottom).toBe('0px')
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
    // Rounded: Firefox lays the edges out a fraction of a pixel apart.
    const invoiceBottom = Math.round(invoice.getBoundingClientRect().bottom)
    expect(
      Math.round(detail.getBoundingClientRect().bottom)
    ).toBeGreaterThanOrEqual(invoiceBottom)
    const navigator = slot('navigator')!
    expect(
      Math.round(navigator.getBoundingClientRect().bottom)
    ).toBeGreaterThanOrEqual(invoiceBottom)
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

  it('prints on plain paper: no fill, border, rounding, or shadow', async () => {
    await print()
    const detail = byTestId('detail')
    const header = slot('pane-header', detail)!
    for (const element of [slot('navigator')!, detail, header]) {
      const style = getComputedStyle(element)
      expect(style.backgroundColor, element.dataset.slot).toBe(
        'rgba(0, 0, 0, 0)'
      )
      expect(style.boxShadow, element.dataset.slot).toBe('none')
    }
    const pane = getComputedStyle(detail)
    expect(pane.borderTopLeftRadius).toBe('0px')
    expect(pane.borderTopColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(header).backdropFilter).toBe('none')
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
    // Rounded, as above.
    expect(
      Math.round(pane.getBoundingClientRect().bottom)
    ).toBeGreaterThanOrEqual(
      Math.round(byTestId('invoice').getBoundingClientRect().bottom)
    )
  })
})

// A header as the pane draws it, scrolled past its title or not. Markup, not a
// scrolled Pane: emulated print lets the pane re-measure its scroll and reopen
// the title, which a real print never does.
const headerMarkup = (collapsed: boolean) =>
  `<header data-slot="pane-header" data-collapsed="${collapsed}" class="${paneHeaderVariants({ collapsed })}"><h2 data-slot="pane-title" class="${paneTitleVariants({ collapsible: true, collapsed })}"><span class="overflow-hidden">Order 1042</span></h2><button data-slot="pane-title-compact" class="${paneTitleCompactVariants({ collapsed })}">Order 1042</button></header>`

describe('printing a pane scrolled past its title', () => {
  async function printTitle(collapsed: boolean) {
    document.body.innerHTML = `<div style="width: 600px">${headerMarkup(collapsed)}</div>`
    await commands.printMedia(true)
    await frames()
    const header = slot('pane-header')!
    const title = slot('pane-title')!
    const box = title.getBoundingClientRect()
    const text = document.createRange()
    text.selectNodeContents(title)
    return {
      top: Math.round(box.top - header.getBoundingClientRect().top),
      height: Math.round(box.height),
      width: Math.round(box.width),
      textHeight: Math.round(text.getBoundingClientRect().height),
      clipped: title.scrollHeight > title.clientHeight,
      opacity: getComputedStyle(title).opacity,
      compact: laidOut(slot('pane-title-compact')),
      shadow: getComputedStyle(header, '::after').boxShadow
    }
  }

  it('prints the title as it prints at the top', async () => {
    const open = await printTitle(false)
    await commands.printMedia(false)
    const scrolled = await printTitle(true)
    expect(scrolled).toEqual(open)
    expect(open).toMatchObject({
      opacity: '1',
      clipped: false,
      compact: false,
      shadow: 'none'
    })
  })
})

// Positions as a frame can hold them before its panes register, while hydrating.
describe('printing a stack whose panes are still registering', () => {
  async function printRow(spec: RowSpec) {
    mount(contentMarkup(rowMarkup(spec)), 1400)
    await frames()
    await commands.printMedia(true)
    await frames()
    return [
      ...document.querySelectorAll<HTMLElement>(
        '[data-slot="pane"][data-stack]'
      )
    ]
  }

  it('prints only the later of two panes that both claim the top', async () => {
    const [first, second] = await printRow({
      panes: [
        { depth: 0, position: 'top' },
        { depth: 1, position: 'top' }
      ]
    })
    expect(laidOut(first)).toBe(false)
    expect(laidOut(second)).toBe(true)
  })

  it.each([0, 1])(
    'leaves out a pane with no position beside the top one, at level %i',
    async (level) => {
      const [unplaced, top] = await printRow({
        level,
        panes: [{ depth: 0 }, { depth: 1, position: 'top' }]
      })
      expect(laidOut(unplaced)).toBe(false)
      expect(laidOut(top)).toBe(true)
    }
  )
})

describe('printing while the frame is moving', () => {
  it('leaves the navigation glow, the page step, and toasts off the paper', async () => {
    mount(
      `<div data-slot="navigator" data-pending="visible">
        <div data-slot="navigator-pending">Waiting</div>
        <div data-slot="navigator-page-ghost">Previous page</div>
      </div>
      <div data-slot="toast-viewport"><p>Tickets resent</p></div>`,
      800
    )
    await commands.printMedia(true)
    await frames()
    for (const name of [
      'navigator-pending',
      'navigator-page-ghost',
      'toast-viewport'
    ])
      expect(laidOut(slot(name)), name).toBe(false)
  })
})
