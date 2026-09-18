'use client'

import type { ReactNode } from 'react'

import Link from 'next/link'

import { useRoute } from '@/lib/route'

import { Button, Pane } from '@oztix/roadie-components'

const lines = (count: number, tag: string) =>
  Array.from({ length: count }, (_, at) => (
    <p key={at} data-testid={`${tag}-${at}`} className='py-2'>
      {tag} line {at}
    </p>
  ))

export default function EventLayout({ children }: { children: ReactNode }) {
  const onEvent = useRoute() === '/debug/stack/evt'
  return (
    <>
      <Pane column='list' depth={0}>
        <Pane.Header>
          <Pane.Title>Events</Pane.Title>
        </Pane.Header>
        <div className='grid gap-2 p-4'>{lines(30, 'list')}</div>
      </Pane>
      <Pane depth={1} reached={onEvent} data-testid='event-pane'>
        <Pane.Header>
          <Pane.Title>Event</Pane.Title>
        </Pane.Header>
        <div className='grid gap-2 p-4'>
          <Link href='/debug/stack/evt/tkt' data-testid='open-ticket'>
            Open ticket
          </Link>
          <Button href='/debug/stack/evt/slow' data-testid='open-slow'>
            Open slow
          </Button>
          {lines(80, 'event')}
        </div>
      </Pane>
      {children}
    </>
  )
}
