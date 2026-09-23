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
  onRevealChange
}: {
  reveal?: boolean
  onRevealChange?: (reveal: boolean) => void
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
      >
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
