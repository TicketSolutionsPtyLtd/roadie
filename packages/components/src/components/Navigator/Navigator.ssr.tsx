import { type ReactNode, useState } from 'react'

import { GearIcon, TicketIcon } from '@phosphor-icons/react'

import { Navigator } from '.'
import { allowing } from '../../utils/hydrationTestUtils'
import { Pane } from '../Pane'

const destinations = ['Discover', 'My tickets', 'Saved']
const rows = Array.from({ length: 6 }, (_, index) => (
  <p key={index}>Ticket type {index + 1}, $68.00</p>
))

const framed = (children: ReactNode, extra = 0) =>
  function Framed() {
    const [active, setActive] = useState('Discover')
    const items = [
      ...destinations,
      ...Array.from({ length: extra }, (_, index) => `Extra ${index + 1}`)
    ]
    return (
      <div className='h-120 overflow-hidden rounded-2xl border border-subtle'>
        <Navigator value={active} onValueChange={setActive} className='h-full'>
          <Navigator.Primary aria-label='Main'>
            <Navigator.Brand />
            {items.map((item) => (
              <Navigator.Item key={item} value={item} icon={<TicketIcon />}>
                {item}
              </Navigator.Item>
            ))}
            <Navigator.Item
              value='Account'
              icon={<GearIcon />}
              placement='pinned'
            >
              Account
            </Navigator.Item>
          </Navigator.Primary>
          {children}
        </Navigator>
      </div>
    )
  }

const pane = (title: string, column?: 'list' | 'inspector') => (
  <Pane key={title} column={column} aria-label={title}>
    <Pane.Header>
      <Pane.Title>{title}</Pane.Title>
    </Pane.Header>
    {rows}
  </Pane>
)

const track = (shift: number, removed?: number) => ({
  ticket: 'INNO-1678',
  shift,
  removed
})

export const OnePaneWithBodyTitle = allowing(
  framed(
    <Pane>
      <Pane.Header />
      <Pane.BodyTitle>Discover</Pane.BodyTitle>
      {rows}
    </Pane>
  ),
  { 390: track(70), 1280: track(70) }
)

export const ListAndDetail = allowing(
  framed([pane('Events', 'list'), pane('Midnight Frequency')]),
  { 390: track(88, 1), 1280: track(98, 1) }
)

export const ListDetailAndInspector = allowing(
  framed([
    pane('Events', 'list'),
    pane('Midnight Frequency'),
    pane('Details', 'inspector')
  ]),
  { 390: track(88, 1), 1280: track(98, 1) }
)

export const FourteenDestinations = allowing(framed(pane('Discover'), 10), {
  390: track(88),
  1280: track(98)
})
