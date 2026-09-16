'use client'

import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import { Button, Pane } from '@oztix/roadie-components'

const lines = (count: number, tag: string) =>
  Array.from({ length: count }, (_, at) => (
    <p key={at} data-testid={`${tag}-${at}`} className='py-2'>
      {tag} line {at}
    </p>
  ))

// Three levels, each pane in its own route segment, as an app has them.
export default function BareEventLayout({ children }: { children: ReactNode }) {
  const onEvent = usePathname() === '/debug/bare/evt'
  return (
    <>
      <Pane role='list' depth={0} data-testid='list-pane'>
        <Pane.Header>
          <Pane.Title>Events</Pane.Title>
        </Pane.Header>
        <div className='grid gap-2 p-4'>{lines(30, 'list')}</div>
      </Pane>
      <Pane role='detail' depth={1} current={onEvent} data-testid='event-pane'>
        <Pane.Header>
          <Pane.Title>Event</Pane.Title>
        </Pane.Header>
        <div className='grid gap-2 p-4'>
          {/* Bug 1 was measured with this trigger, and it measured the
              harness: a trigger at the top of a scrolled pane cannot be
              clicked without moving the pane first, so Playwright's
              actionability scroll takes the pane to the trigger and the run
              reads its own scroll back. Kept, because that is the lesson. */}
          <Button href='/debug/bare/evt/tkt' data-testid='open-ticket'>
            Open ticket (top of the pane)
          </Button>
          <Button href='/debug/bare/evt/slow' data-testid='open-slow'>
            Open slow
          </Button>
          {lines(30, 'event')}
          {/* Far enough down to still be on screen once the pane is scrolled,
              so a real click needs no scroll-into-view first. Anything
              measuring a pane's scroll across a navigation uses this one. */}
          <Button href='/debug/bare/evt/tkt' data-testid='open-ticket-inline'>
            Open ticket (in view when scrolled)
          </Button>
          {lines(50, 'event-tail')}
        </div>
      </Pane>
      {children}
    </>
  )
}
