'use client'

import { Pane } from '@oztix/roadie-components'

export default function BareTicketPage() {
  return (
    <Pane data-testid='ticket-pane'>
      <Pane.Header>
        <Pane.Title>Ticket</Pane.Title>
      </Pane.Header>
      <div className='grid gap-2 p-4'>
        {Array.from({ length: 40 }, (_, at) => (
          <p key={at} className='py-2'>
            ticket line {at}
          </p>
        ))}
      </div>
    </Pane>
  )
}
