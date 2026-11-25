import type { ReactNode } from 'react'

import { Pane } from '.'
import { allowing } from '../../utils/hydrationTestUtils'

const framed = (children: ReactNode) => () => (
  <div className='h-80 rounded-2xl bg-sunken p-3'>
    <Pane className='h-full'>{children}</Pane>
  </div>
)
const rows = Array.from({ length: 6 }, (_, index) => (
  <p key={index}>Ticket type {index + 1}, $68.00</p>
))
const header = (
  <Pane.Header key='header'>
    <Pane.Title>Midnight Frequency</Pane.Title>
  </Pane.Header>
)
const track = (shift: number) => ({ ticket: 'INNO-1678', shift })

export const NoHeader = framed(rows)

export const EmptyHeaderAndBodyTitle = allowing(
  framed([
    <Pane.Header key='header' />,
    <Pane.BodyTitle key='title'>Midnight Frequency</Pane.BodyTitle>,
    rows
  ]),
  { 390: track(70), 1280: track(70) }
)

export const HeaderAndTitle = allowing(framed([header, rows]), {
  390: track(88),
  1280: track(98)
})

export const HeaderAndFooter = allowing(
  framed([header, rows, <Pane.Footer key='footer'>Total $68.00</Pane.Footer>]),
  { 390: track(88), 1280: track(98) }
)
