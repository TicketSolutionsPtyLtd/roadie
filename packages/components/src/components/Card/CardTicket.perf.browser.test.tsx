import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Card } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Carousel } from '../Carousel'

setupFrameTests({ css: roadieCss })

const TICKETS = Array.from({ length: 40 }, (_, index) => ({
  id: `A7K2MKW${index}`,
  section: index % 3 ? 'General admission' : 'Mezzanine, row C',
  holder: ['Sam Okafor', 'Priya Natarajan', 'Jordan Ellis'][index % 3]!
}))

function Ticket({ ticket }: { ticket: (typeof TICKETS)[number] }) {
  return (
    <Card variant='ticket' emphasis='raised'>
      <Card.Content className='grid justify-items-center gap-4 p-6 pb-5'>
        <div className='aspect-square w-40 rounded-lg emphasis-subtle' />
        <p className='text-display-ui-4 text-strong'>{ticket.section}</p>
      </Card.Content>
      <Card.Footer className='grid gap-1'>
        <p className='font-semibold text-strong'>{ticket.holder}</p>
        <p className='text-sm text-subtle'>{ticket.id}</p>
      </Card.Footer>
    </Card>
  )
}

function TicketCarousel() {
  return (
    <div style={{ width: 960 }}>
      <Carousel aria-label='Your tickets'>
        <Carousel.Header>
          <Carousel.Title>Your tickets</Carousel.Title>
          <Carousel.Dots />
          <Carousel.Controls>
            <Carousel.Previous />
            <Carousel.Next />
          </Carousel.Controls>
        </Carousel.Header>
        <Carousel.Content>
          {TICKETS.slice(0, 12).map((ticket) => (
            <Carousel.Item key={ticket.id} className='basis-1/3'>
              <Ticket ticket={ticket} />
            </Carousel.Item>
          ))}
        </Carousel.Content>
      </Carousel>
    </div>
  )
}

const button = (root: HTMLElement, label: string) =>
  root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!

describe('Ticket cards move at 60fps on a slowed CPU', () => {
  it('slides a carousel of tickets on with Next and back with Previous', async () => {
    const root = await mount(<TicketCarousel />, { frames: 10 })
    for (const [scenario, label] of [
      ['Next', 'Next slide'],
      ['Previous', 'Previous slide']
    ] as const) {
      await expectFrameBudget(
        `Card ticket in a Carousel, ${scenario}`,
        await measureFrames(
          (index) => index === 0 && button(root, label).click(),
          { frames: 60 }
        )
      )
    }
    expect(button(root, 'Go to slide 1')).toHaveAttribute(
      'aria-current',
      'true'
    )
  })

  it('scrolls a list of 40 tickets', async () => {
    const root = await mount(
      <div
        data-testid='list'
        style={{ width: 420, height: 800, overflowY: 'auto' }}
      >
        <div className='grid gap-4 p-4'>
          {TICKETS.map((ticket) => (
            <Ticket key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </div>,
      { frames: 5 }
    )
    const list = root.querySelector<HTMLElement>('[data-testid=list]')!
    await expectFrameBudget(
      'Card ticket, 40 in a list, scroll',
      await measureFrames(() => {
        list.scrollTop += 60
      })
    )
    expect(list.scrollTop).toBeGreaterThan(3000)
  })
})
