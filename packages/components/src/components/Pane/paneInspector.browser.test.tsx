import { useState } from 'react'

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { Pane } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Navigator } from '../Navigator'
import { useStylesheet } from './testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const NARROW = 700
const WIDE = 1600

function Shell({
  reveal,
  onRevealChange,
  drawerSize,
  header = false
}: {
  reveal?: boolean
  onRevealChange?: (reveal: boolean) => void
  drawerSize?: 'fit' | 'sm' | 'md' | 'lg'
  header?: boolean
}) {
  return (
    <Navigator className='h-[600px]'>
      <Pane column='list' aria-label='Events'>
        <p>Events</p>
      </Pane>
      <Pane aria-label='Paperbark Sessions'>
        <Pane.Header>
          <Pane.Title>Paperbark Sessions</Pane.Title>
          <Pane.Actions>
            <Pane.InspectorTrigger aria-label='Tickets'>
              <span>T</span>
            </Pane.InspectorTrigger>
          </Pane.Actions>
        </Pane.Header>
        <p>Event details</p>
      </Pane>
      <Pane
        column='inspector'
        aria-label='Tickets'
        reveal={reveal}
        onRevealChange={onRevealChange}
        drawerSize={drawerSize}
      >
        {header ? (
          <Pane.Header>
            <Pane.Title>12 tickets</Pane.Title>
          </Pane.Header>
        ) : null}
        <p>12 tickets</p>
      </Pane>
    </Navigator>
  )
}

function mount(width: number, ui = <Shell />) {
  const host = document.createElement('div')
  host.style.width = `${width}px`
  document.body.append(host)
  render(ui, { container: host })
  return host
}

const column = () =>
  document.querySelector<HTMLElement>('[data-column="inspector"]')!
const trigger = () =>
  document.querySelector<HTMLElement>('button[aria-label="Tickets"]')!
const shows = (element: Element) => getComputedStyle(element).display !== 'none'

describe('an inspector with room for its column', () => {
  it('keeps its content in the column and hides the trigger', async () => {
    mount(WIDE)

    await waitFor(() => expect(column()).toHaveTextContent('12 tickets'))
    expect(shows(column())).toBe(true)
    expect(shows(trigger())).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('takes a reveal as already met', async () => {
    mount(WIDE, <Shell reveal />)

    await waitFor(() => expect(column()).toHaveTextContent('12 tickets'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('an inspector whose column has yielded', () => {
  it('shows the trigger, which opens the content in a drawer', async () => {
    mount(NARROW)

    await waitFor(() => expect(shows(trigger())).toBe(true))
    expect(column()).not.toHaveTextContent('12 tickets')

    await userEvent.click(trigger())
    const drawer = await screen.findByRole('dialog', { name: 'Tickets' })
    expect(drawer).toHaveTextContent('12 tickets')
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens a fixed tall drawer, so filtering the content cannot resize it', async () => {
    mount(NARROW)
    await waitFor(() => expect(shows(trigger())).toBe(true))

    await userEvent.click(trigger())
    expect(await screen.findByRole('dialog')).toHaveAttribute('data-size', 'lg')
  })

  it('takes another size from the app', async () => {
    mount(NARROW, <Shell reveal drawerSize='md' />)

    expect(await screen.findByRole('dialog')).toHaveAttribute('data-size', 'md')
  })

  it('keeps the page readable behind the drawer', async () => {
    mount(NARROW)
    await waitFor(() => expect(shows(trigger())).toBe(true))

    await userEvent.click(trigger())
    await screen.findByRole('dialog')
    expect(document.querySelector('[data-slot="drawer-backdrop"]')).toHaveClass(
      'emphasis-overlay-subtle'
    )
  })

  it('opens the drawer itself when revealed', async () => {
    mount(NARROW, <Shell reveal />)

    const drawer = await screen.findByRole('dialog', { name: 'Tickets' })
    expect(drawer).toHaveTextContent('12 tickets')
  })

  it('reports a dismissal', async () => {
    const onRevealChange = vi.fn()
    function Controlled() {
      const [reveal, setReveal] = useState(true)
      return (
        <Shell
          reveal={reveal}
          onRevealChange={(next) => {
            onRevealChange(next)
            setReveal(next)
          }}
        />
      )
    }
    mount(NARROW, <Controlled />)
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onRevealChange).toHaveBeenCalledWith(false)
  })

  it('moves its content back to the column when the room returns', async () => {
    const host = mount(NARROW)
    await waitFor(() => expect(shows(trigger())).toBe(true))
    await userEvent.click(trigger())
    await screen.findByRole('dialog')

    host.style.width = `${WIDE}px`

    await waitFor(() => expect(column()).toHaveTextContent('12 tickets'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe("an inspector drawer's Close", () => {
  const closes = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>('button[aria-label="Close"]')
    ).filter((button) => button.checkVisibility())

  it("puts Close in the content's own header, 24px from the corner", async () => {
    mount(NARROW, <Shell reveal header />)
    const drawer = await screen.findByRole('dialog', { name: 'Tickets' })

    const [close, ...extra] = closes()
    expect(extra).toHaveLength(0)
    expect(close!.closest('[data-slot="pane-header"]')).not.toBeNull()
    const popup = drawer.getBoundingClientRect()
    const box = close!.getBoundingClientRect()
    expect(box.top - popup.top).toBeCloseTo(24, 0)
    expect(box.left - popup.left).toBeCloseTo(24, 0)
  })

  it('gives content without a header a Close of its own', async () => {
    mount(NARROW, <Shell reveal />)
    await screen.findByRole('dialog', { name: 'Tickets' })

    const [close, ...extra] = closes()
    expect(extra).toHaveLength(0)
    expect(close!.closest('[data-slot="drawer-header"]')).not.toBeNull()
  })

  it('closes the drawer and reports it', async () => {
    const onRevealChange = vi.fn()
    function Controlled() {
      const [reveal, setReveal] = useState(true)
      return (
        <Shell
          header
          reveal={reveal}
          onRevealChange={(next) => {
            onRevealChange(next)
            setReveal(next)
          }}
        />
      )
    }
    mount(NARROW, <Controlled />)
    await screen.findByRole('dialog')

    await userEvent.click(closes()[0]!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onRevealChange).toHaveBeenCalledWith(false)
  })

  it('draws no Close in the column', async () => {
    mount(WIDE, <Shell header />)
    await waitFor(() => expect(column().textContent).toContain('12 tickets'))

    expect(column().querySelector('button[aria-label="Close"]')).toBeNull()
  })

  it("publishes the header's height on the drawer, as a pane does", async () => {
    mount(NARROW, <Shell reveal header />)
    const drawer = await screen.findByRole('dialog')
    const header = drawer.querySelector('[data-slot="pane-header"]')!

    await waitFor(() =>
      expect(drawer.style.getPropertyValue('--pane-header-height')).toBe(
        `${(header as HTMLElement).offsetHeight}px`
      )
    )
  })

  it('gives sticky chrome in the drawer the drawer surface to mix against', async () => {
    mount(NARROW, <Shell reveal header />)
    const drawer = await screen.findByRole('dialog')

    expect(
      getComputedStyle(drawer).getPropertyValue('--pane-surface').trim()
    ).not.toBe('')
  })
})
