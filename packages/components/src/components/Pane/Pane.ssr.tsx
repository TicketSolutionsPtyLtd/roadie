import type { ReactNode } from 'react'

import { Pane } from '.'

const framed = (children: ReactNode) => () => (
  <div className='h-80 rounded-2xl bg-sunken p-3'>
    <Pane className='h-full'>{children}</Pane>
  </div>
)
const rows = Array.from({ length: 6 }, (_, index) => (
  <p key={index}>Ticket type {index + 1}, $68.00</p>
))

export const NoHeader = framed(rows)
