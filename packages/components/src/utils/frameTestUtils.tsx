import type { ReactNode } from 'react'

const EVENTS = Array.from({ length: 60 }, (_, index) => ({
  title: `The Rolling Kazoos, night ${index + 1}`,
  venue: ['Kazoo Hollow Room', 'The Tin Lantern', 'Gumleaf Hall'][index % 3],
  date: `Fri ${(index % 28) + 1} Sep`
}))

/**
 * A page of event cards behind the component, so an overlay's backdrop, blur,
 * and restyle cost what they would on a real screen.
 */
export function EventPage({ children }: { children?: ReactNode }) {
  return (
    <div className='grid gap-4 p-4' style={{ width: 1440 }}>
      {children}
      <div className='grid grid-cols-4 gap-4'>
        {EVENTS.map((event) => (
          <article
            key={event.title}
            className='grid emphasis-raised gap-2 rounded-xl p-4'
          >
            <div className='aspect-video rounded-lg emphasis-subtle' />
            <h3 className='text-display-ui-5'>{event.title}</h3>
            <p className='text-sm text-subtle'>
              {event.venue} · {event.date}
            </p>
          </article>
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
