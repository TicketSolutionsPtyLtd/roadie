import type { ReactNode } from 'react'

import { Card } from '../components/Card'

const EVENTS = Array.from({ length: 60 }, (_, index) => ({
  title: `The Rolling Kazoos, night ${index + 1}`,
  venue: ['Kazoo Hollow Room', 'The Tin Lantern', 'Gumleaf Hall'][index % 3],
  date: `Fri ${(index % 28) + 1} Sep`
}))

/**
 * A page of event cards behind the component, so an overlay's backdrop, blur,
 * and restyle cost what they would on a real screen. Each is a real Card with
 * a Card.Link, so the card's own `:has()` rules are live behind every overlay.
 * `variant='ticket'` gives each a footer, so its notches are drawn.
 */
export function EventPage({
  children,
  variant = 'default'
}: {
  children?: ReactNode
  variant?: 'default' | 'ticket'
}) {
  return (
    <div className='grid gap-4 p-4' style={{ width: 1440 }}>
      {children}
      <div className='grid grid-cols-4 gap-4'>
        {EVENTS.map((event, index) => (
          <Card key={event.title} variant={variant} emphasis='raised'>
            <Card.Content className='grid gap-2'>
              <div className='aspect-video rounded-lg emphasis-subtle' />
              <Card.Title>
                <Card.Link href={`/events/${index + 1}`}>
                  {event.title}
                </Card.Link>
              </Card.Title>
              <Card.Description>
                {event.venue} · {event.date}
              </Card.Description>
            </Card.Content>
            {variant === 'ticket' && (
              <Card.Footer>
                <p className='text-sm text-subtle'>Admit one</p>
              </Card.Footer>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

export function pressEscape() {
  ;(document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  )
}

export const byText = <T extends HTMLElement = HTMLButtonElement>(
  selector: string,
  text: string
) =>
  [...document.querySelectorAll<T>(selector)].find(
    (element) => element.textContent?.trim() === text
  )!

const VENUE_NAMES = [
  'Kazoo Hollow Room',
  'The Tin Lantern',
  'Gumleaf Hall',
  'Iguana Teapot Hall'
]

/** Fictional venues, numbered so every name is unique. */
export const venues = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `${VENUE_NAMES[index % VENUE_NAMES.length]} ${index + 1}`
  )

/**
 * Dialog and Drawer keep their full-page backdrop blur by design. Drawing it
 * costs more than a frame in CI's software raster, whatever the radius, and
 * none of the cheaper ways to blur kept the look (INNO-1522).
 */
export const BACKDROP_BLUR =
  'the full-page backdrop blur, kept by design (INNO-1522)'
