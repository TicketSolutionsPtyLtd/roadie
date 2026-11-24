import { afterAll, describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  settle,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Card } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage } from '../../utils/frameTestUtils'
import { Carousel } from '../Carousel'
import { QRCode } from '../QRCode'

setupFrameTests({ css: roadieCss })

afterAll(() => {
  document.scrollingElement!.scrollTop = 0
})

type Variant = 'default' | 'ticket'
type Emphasis = 'raised' | 'normal' | 'subtle'

// Where `corner-shape` is supported (Chromium), the ticket's notches are
// scoops. Elsewhere (WebKit and Firefox today) a mask cuts each part instead,
// a path Chromium never draws, so a WebKit run is the only one that covers it.
const MASK_NOTE = 'notches cut by mask (no corner-shape)'
const note = (variant: Variant) =>
  variant === 'ticket' && !CSS.supports('corner-shape', 'scoop')
    ? MASK_NOTE
    : undefined

const TICKETS = Array.from({ length: 12 }, (_, index) => ({
  id: `A7K2MKW${index}`,
  section: index % 3 ? 'General admission' : 'VIP, early entry',
  holder: ['Sam Okafor', 'Priya Natarajan', 'Jordan Ellis'][index % 3]!
}))

function TicketCarousel({
  variant,
  emphasis
}: {
  variant: Variant
  emphasis: Emphasis
}) {
  return (
    <div style={{ width: 960, padding: 24 }}>
      <Carousel aria-label='Your tickets'>
        <Carousel.Header>
          <Carousel.Title>Your tickets</Carousel.Title>
          <Carousel.Controls>
            <Carousel.Previous />
            <Carousel.Next />
          </Carousel.Controls>
        </Carousel.Header>
        <Carousel.Content>
          {TICKETS.map((ticket) => (
            <Carousel.Item key={ticket.id} className='basis-1/3'>
              <Card variant={variant} emphasis={emphasis}>
                <Card.Content className='grid justify-items-center gap-4 p-6'>
                  <div className='mx-auto w-full max-w-60'>
                    <QRCode value={ticket.id} aria-label={ticket.id} />
                  </div>
                  <p className='text-display-ui-5 text-strong'>
                    {ticket.section}
                  </p>
                </Card.Content>
                <Card.Footer className='grid gap-0.5'>
                  <p className='truncate font-medium text-strong'>
                    {ticket.holder}
                  </p>
                  <p className='truncate text-sm text-subtle'>{ticket.id}</p>
                </Card.Footer>
              </Card>
            </Carousel.Item>
          ))}
        </Carousel.Content>
      </Carousel>
    </div>
  )
}

const track = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-slot="carousel-container"]')!

/**
 * A mouse drag of `distance` px over `moves` frames, then a release. Embla
 * listens for the press on its root and the moves and release on the
 * document.
 */
function mouseDrag(root: HTMLElement, moves: number, distance: number) {
  const content = root.querySelector<HTMLElement>(
    '[data-slot="carousel-content"]'
  )!
  const box = content.getBoundingClientRect()
  const y = box.top + box.height / 2
  const startX = box.right - 80
  const fire = (target: EventTarget, type: string, x: number) =>
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === 'mouseup' ? 0 : 1
      })
    )
  return (index: number) => {
    const x = startX - (distance * Math.min(index, moves)) / moves
    if (index === 0) fire(content, 'mousedown', x)
    else if (index < moves) fire(document, 'mousemove', x)
    else if (index === moves) fire(document, 'mouseup', x)
  }
}

const CAROUSEL_CASES = (['default', 'ticket'] as const).flatMap((variant) =>
  (['raised', 'normal', 'subtle'] as const).map(
    (emphasis) => [variant, emphasis] as const
  )
)

describe('Cards move at 60fps on a slowed CPU', () => {
  it.each(CAROUSEL_CASES)(
    'drags a carousel of 12 %s %s cards',
    async (variant, emphasis) => {
      const root = await mount(
        <TicketCarousel variant={variant} emphasis={emphasis} />,
        { frames: 10 }
      )
      const drag = mouseDrag(root, 45, 620)
      const start = track(root).getBoundingClientRect().left
      let moved = 0
      await expectFrameBudget(
        `Card ${variant} ${emphasis} in a Carousel, drag`,
        await measureFrames(
          (index) => {
            drag(index)
            if (index === 40)
              moved = start - track(root).getBoundingClientRect().left
          },
          { frames: 90 }
        ),
        { note: note(variant) }
      )
      // The track followed the pointer, or the run measured a still page.
      expect(moved).toBeGreaterThan(200)
    }
  )

  it.each(['default', 'ticket'] as const)(
    'scrolls a page of 60 %s raised cards',
    async (variant) => {
      const page = document.scrollingElement as HTMLElement
      page.scrollTop = 0
      await mount(<EventPage variant={variant} />, { frames: 10 })
      expect(document.querySelectorAll('[data-slot="card"]')).toHaveLength(60)
      await expectFrameBudget(
        `Card ${variant} raised, 60 on a page, scroll`,
        await measureFrames(() => {
          page.scrollTop += 25
        }),
        { note: note(variant) }
      )
      // Still scrolling at the end, so no frame measured a page at rest.
      expect(page.scrollTop).toBe(120 * 25)
      page.scrollTop = 0
      await settle(2)
    }
  )
})
