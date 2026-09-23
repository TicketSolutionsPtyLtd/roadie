import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Card } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

// The states are the settled ones, so no test waits on a transition to land.
const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(async () => {
  await userEvent.unhover(document.body)
  cleanup()
})

const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

function renderCard(props: Partial<React.ComponentProps<typeof Card>> = {}) {
  const { container } = render(
    <div style={{ padding: 24, width: 360 }}>
      <Card variant='ticket' emphasis='raised' {...props}>
        <Card.Content>
          <Card.Title>
            <Card.Link href='#weekly-pass'>Weekly Pass</Card.Link>
          </Card.Title>
          <p data-testid='body'>Mon 3 to Fri 7 May</p>
        </Card.Content>
        <Card.Footer>
          <p data-testid='count'>638 tickets</p>
          <a data-testid='pill' href='#shared'>
            376 shared
          </a>
        </Card.Footer>
      </Card>
    </div>
  )
  const part = (id: string) =>
    container.querySelector<HTMLElement>(`[data-testid=${id}]`)!
  return {
    card: container.querySelector<HTMLElement>('[data-slot=card]')!,
    link: container.querySelector<HTMLElement>('[data-slot=card-link]')!,
    body: part('body'),
    count: part('count'),
    pill: part('pill')
  }
}

const hitAt = (element: HTMLElement) => {
  element.scrollIntoView({ block: 'center' })
  const { left, top, width, height } = element.getBoundingClientRect()
  return document.elementFromPoint(left + width / 2, top + height / 2)
}

const lift = (card: HTMLElement) =>
  new DOMMatrix(getComputedStyle(card).transform).f

describe('Card.Link', () => {
  it('takes a click anywhere on the card, footer included', () => {
    const { link, body, count } = renderCard({ variant: undefined })

    expect(hitAt(body)).toBe(link)
    expect(hitAt(count)).toBe(link)
  })

  // Without corner-shape, a ticket masks each part for its notches, and a
  // masked part keeps the link's overlay inside it, so the footer's text
  // doesn't follow the link there. Its own links still work.
  it.runIf(CSS.supports('corner-shape', 'scoop'))(
    "takes a click on a ticket's footer too",
    () => {
      const { link, count } = renderCard()

      expect(hitAt(count)).toBe(link)
    }
  )

  it('leaves other links inside the card clickable above it', () => {
    const { pill } = renderCard()

    expect(hitAt(pill)).toBe(pill)
  })

  it('lifts the card while the main link is hovered, not another link', async () => {
    const { card, link, pill } = renderCard()
    await frame()
    expect(lift(card)).toBeCloseTo(0)

    await userEvent.hover(link)
    await frame()
    expect(lift(card)).toBeCloseTo(-1)

    await userEvent.hover(pill)
    await frame()
    expect(lift(card)).toBeCloseTo(0)
  })

  it('rings the card when the main link has keyboard focus', async () => {
    const { card, link, pill } = renderCard()

    // Tab skips links in WebKit and in macOS Firefox by default, so focus after a key press, which still reads as keyboard focus.
    await userEvent.keyboard('{Shift}')
    link.focus()
    await frame()
    expect(parseFloat(getComputedStyle(card).outlineWidth)).toBeGreaterThan(0)
    expect(lift(card)).toBeCloseTo(-1)

    await userEvent.keyboard('{Shift}')
    pill.focus()
    await frame()
    expect(parseFloat(getComputedStyle(card).outlineWidth)).toBe(0)
    expect(lift(card)).toBeCloseTo(0)
  })

  it("names the link by its own text, not the whole card's", () => {
    const { link } = renderCard()

    expect(link).toHaveAccessibleName('Weekly Pass')
    expect(link).toHaveAttribute('href', '#weekly-pass')
  })

  it("takes a plain card's emphasis states too", async () => {
    const { card, link } = renderCard({
      variant: undefined,
      emphasis: 'normal'
    })
    const rest = getComputedStyle(card).backgroundColor

    await userEvent.hover(link)
    await frame()
    expect(getComputedStyle(card).backgroundColor).not.toBe(rest)
    expect(lift(card)).toBeCloseTo(-1)
  })

  it("keeps a control's own position", () => {
    const { container } = render(
      <Card>
        <Card.Content>
          <Card.Title>
            <Card.Link href='#weekly-pass'>Weekly Pass</Card.Link>
          </Card.Title>
          <button type='button' className='absolute top-2 right-2'>
            Save
          </button>
        </Card.Content>
      </Card>
    )
    const button = container.querySelector('button')!

    expect(getComputedStyle(button).position).toBe('absolute')
  })

  it("leaves a card's controls alone until it has a main link", () => {
    const { container } = render(
      <Card>
        <Card.Content>
          <button type='button'>Save</button>
        </Card.Content>
      </Card>
    )
    const card = container.querySelector<HTMLElement>('[data-slot=card]')!
    const button = container.querySelector('button')!

    expect(getComputedStyle(button).position).toBe('static')
    expect(getComputedStyle(card).position).toBe('static')
  })

  it('does nothing to a card without one', async () => {
    const { container } = render(
      <Card emphasis='normal'>
        <Card.Content>
          <p data-testid='plain'>Weekly Pass</p>
        </Card.Content>
      </Card>
    )
    const card = container.querySelector<HTMLElement>('[data-slot=card]')!
    const rest = getComputedStyle(card).backgroundColor

    await userEvent.hover(card)
    await frame()
    expect(getComputedStyle(card).backgroundColor).toBe(rest)
    expect(lift(card)).toBeCloseTo(0)
  })
})
