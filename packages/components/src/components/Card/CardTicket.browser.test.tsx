import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Card } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

const BACKDROP = [255, 0, 255]
const NOTCH_RADIUS = 12

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

type Pixel = [number, number, number]

async function capture(host: HTMLElement) {
  const base64 = await page.screenshot({ element: host, save: false })
  const image = new Image()
  image.src = `data:image/png;base64,${base64}`
  await image.decode()

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0)

  const box = host.getBoundingClientRect()
  const scale = image.width / box.width
  return (x: number, y: number): Pixel => {
    const [r, g, b] = context.getImageData(
      Math.round((x - box.left) * scale),
      Math.round((y - box.top) * scale),
      1,
      1
    ).data
    return [r!, g!, b!]
  }
}

const distance = (a: Pixel, b: readonly number[]) =>
  Math.max(...a.map((channel, index) => Math.abs(channel - b[index]!)))

describe.each(['raised', 'normal', 'subtle', 'subtler'] as const)(
  'Card ticket, %s emphasis',
  (emphasis) => {
    function renderTicket() {
      const { container } = render(
        <div
          data-testid='host'
          style={{ padding: 24, width: 360, background: `rgb(${BACKDROP})` }}
        >
          <Card variant='ticket' emphasis={emphasis}>
            <Card.Content>
              <p>General admission</p>
            </Card.Content>
            <Card.Footer>
              <p>Sam Okafor</p>
            </Card.Footer>
          </Card>
        </div>
      )
      const host = container.querySelector<HTMLElement>('[data-testid=host]')!
      const card = host.querySelector<HTMLElement>('[data-slot=card]')!
      const body = card.querySelector<HTMLElement>('[data-slot=card-content]')!
      const footer = card.querySelector<HTMLElement>('[data-slot=card-footer]')!
      return { host, card, body, footer }
    }

    it('meets the body at the perforation with no gap or overlap', () => {
      const { body, footer } = renderTicket()
      const bodyBottom = body.getBoundingClientRect().bottom
      const footerTop = footer.getBoundingClientRect().top

      expect(footerTop - bodyBottom).toBeCloseTo(0, 1)
    })

    it('cuts a hole on both sides, with no seam along the join', async () => {
      const { host, card, footer } = renderTicket()
      const sample = await capture(host)
      const { left, right } = card.getBoundingClientRect()
      const join = footer.getBoundingClientRect().top
      const fill = sample(left + NOTCH_RADIUS + 6, join - 8)

      expect(distance(sample(left + 4, join), BACKDROP)).toBeLessThanOrEqual(2)
      expect(distance(sample(right - 4, join), BACKDROP)).toBeLessThanOrEqual(2)
      expect(distance(fill, BACKDROP)).toBeGreaterThan(4)
      expect(
        distance(sample(left + NOTCH_RADIUS + 6, join), fill)
      ).toBeLessThanOrEqual(2)
      expect(
        distance(sample(right - NOTCH_RADIUS - 6, join), fill)
      ).toBeLessThanOrEqual(2)
    })
  }
)

describe('Card ticket without a footer', () => {
  it('paints the fill on the root', async () => {
    const { container } = render(
      <div
        data-testid='host'
        style={{ padding: 24, width: 360, background: `rgb(${BACKDROP})` }}
      >
        <Card variant='ticket' emphasis='raised'>
          <Card.Content>
            <p>General admission</p>
          </Card.Content>
        </Card>
      </div>
    )
    const host = container.querySelector<HTMLElement>('[data-testid=host]')!
    const card = host.querySelector<HTMLElement>('[data-slot=card]')!
    const sample = await capture(host)
    const { left, top } = card.getBoundingClientRect()

    expect(distance(sample(left + 8, top + 40), BACKDROP)).toBeGreaterThan(40)
  })
})

describe('Card ticket with a tall body', () => {
  it('paints the fill all the way to the top', async () => {
    const { container } = render(
      <div
        data-testid='host'
        style={{ padding: 24, width: 360, background: `rgb(${BACKDROP})` }}
      >
        <Card variant='ticket' emphasis='raised'>
          <Card.Content style={{ height: '140rem' }}>
            <p>General admission</p>
          </Card.Content>
          <Card.Footer>
            <p>Sam Okafor</p>
          </Card.Footer>
        </Card>
      </div>
    )
    const host = container.querySelector<HTMLElement>('[data-testid=host]')!
    const card = host.querySelector<HTMLElement>('[data-slot=card]')!
    const sample = await capture(host)
    const { left, top } = card.getBoundingClientRect()

    expect(distance(sample(left + 24, top + 40), BACKDROP)).toBeGreaterThan(40)
  })
})

const paintedFill = (footer: HTMLElement) =>
  getComputedStyle(footer).backgroundColor

// The states are the settled ones, so no test waits on a transition to land.
const STILL = '*, *::before, *::after { transition: none !important }'

const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

type State = { fill?: string; transform?: 'lift' | 'press' }
const STATES: Record<
  'raised' | 'normal' | 'subtle' | 'subtler',
  { rest: State; hover: State; active: State }
> = {
  raised: {
    rest: { fill: '--intent-bg-raised' },
    hover: { fill: '--intent-bg-raised', transform: 'lift' },
    active: { fill: '--intent-bg-raised', transform: 'press' }
  },
  normal: {
    rest: { fill: '--intent-bg-normal' },
    hover: { fill: '--intent-2', transform: 'lift' },
    active: { fill: '--intent-3', transform: 'press' }
  },
  subtle: {
    rest: { fill: '--intent-bg-subtle' },
    hover: { fill: '--intent-4a' },
    active: { fill: '--intent-5a' }
  },
  subtler: {
    rest: {},
    hover: { fill: '--intent-3a' },
    active: { fill: '--intent-4a' }
  }
}

describe.each(Object.entries(STATES))(
  'Card ticket, interactive %s emphasis',
  (emphasis, states) => {
    let removeStill = () => {}
    beforeAll(() => {
      removeStill = useStylesheet(STILL)
    })
    afterAll(() => removeStill())
    afterEach(async () => {
      await userEvent.unhover(document.body)
    })

    function renderLinkedTicket() {
      const { container } = render(
        <div style={{ padding: 24, width: 360 }}>
          <Card
            variant='ticket'
            emphasis={emphasis as keyof typeof STATES}
            href='#ticket'
          >
            <Card.Content>
              <p>General admission</p>
              <span data-testid='probe' />
            </Card.Content>
            <Card.Footer>
              <p>Sam Okafor</p>
            </Card.Footer>
          </Card>
        </div>
      )
      const card = container.querySelector<HTMLElement>('[data-slot=card]')!
      const footer = card.querySelector<HTMLElement>('[data-slot=card-footer]')!
      const probe = card.querySelector<HTMLElement>('[data-testid=probe]')!
      return { card, footer, probe }
    }

    function expectState(
      { card, footer, probe }: ReturnType<typeof renderLinkedTicket>,
      state: State
    ) {
      probe.style.backgroundColor = state.fill
        ? `var(${state.fill})`
        : 'transparent'
      expect(paintedFill(footer)).toBe(getComputedStyle(probe).backgroundColor)
      const matrix = new DOMMatrix(getComputedStyle(card).transform)
      if (state.transform === 'lift') expect(matrix.f).toBeCloseTo(-1)
      if (state.transform === 'press') expect(matrix.a).toBeCloseTo(0.99)
      if (!state.transform) expect(matrix.isIdentity).toBe(true)
    }

    it('matches the plain emphasis at rest, on hover and when active', async () => {
      const ticket = renderLinkedTicket()
      await frame()
      expectState(ticket, states.rest)

      await userEvent.hover(ticket.card)
      await frame()
      expectState(ticket, states.hover)

      await userEvent.unhover(ticket.card)
      ticket.card.classList.add('is-active')
      await frame()
      expectState(ticket, states.active)
    })
  }
)

type Corner = { x: number; y: number }

function expectHoles(
  sample: (x: number, y: number) => Pixel,
  a: Corner,
  b: Corner,
  fill: Pixel
) {
  expect(distance(sample(a.x, a.y), BACKDROP)).toBeLessThanOrEqual(2)
  expect(distance(sample(b.x, b.y), BACKDROP)).toBeLessThanOrEqual(2)
  expect(distance(fill, BACKDROP)).toBeGreaterThan(4)
}

describe.each(['raised', 'normal', 'subtle', 'subtler'] as const)(
  'Card ticket, horizontal, %s emphasis',
  (emphasis) => {
    function renderTicket(direction: 'horizontal' | 'auto', width: number) {
      const { container } = render(
        <div
          data-testid='host'
          style={{ padding: 24, width, background: `rgb(${BACKDROP})` }}
        >
          <Card variant='ticket' emphasis={emphasis} direction={direction}>
            <Card.Content style={{ height: 160 }}>
              <p>General admission</p>
            </Card.Content>
            <Card.Footer>
              <p>Sam Okafor</p>
            </Card.Footer>
          </Card>
        </div>
      )
      const host = container.querySelector<HTMLElement>('[data-testid=host]')!
      const card = host.querySelector<HTMLElement>('[data-slot=card]')!
      const body = card.querySelector<HTMLElement>('[data-slot=card-content]')!
      const footer = card.querySelector<HTMLElement>('[data-slot=card-footer]')!
      return { host, card, body, footer }
    }

    it('seats the footer beside the body', () => {
      const { body, footer } = renderTicket('horizontal', 560)

      expect(
        footer.getBoundingClientRect().left - body.getBoundingClientRect().right
      ).toBeCloseTo(0, 1)
      expect(
        footer.getBoundingClientRect().top - body.getBoundingClientRect().top
      ).toBeCloseTo(0, 1)
    })

    it('fills the body column when the footer is taller', () => {
      const { card, body, footer } = renderTicket('horizontal', 560)
      body.style.height = ''
      footer.style.minHeight = '320px'

      expect(footer.getBoundingClientRect().height).toBeCloseTo(
        card.getBoundingClientRect().height,
        1
      )
      expect(body.getBoundingClientRect().bottom).toBeCloseTo(
        card.getBoundingClientRect().bottom,
        1
      )
    })

    it('runs the footer the full height of the card when horizontal', () => {
      const { card, footer } = renderTicket('horizontal', 560)

      expect(footer.getBoundingClientRect().height).toBeCloseTo(
        card.getBoundingClientRect().height,
        1
      )
    })

    it('cuts a hole at each end of the join, with no seam along it', async () => {
      const { host, card, footer } = renderTicket('horizontal', 560)
      const sample = await capture(host)
      const { top, bottom } = card.getBoundingClientRect()
      const join = footer.getBoundingClientRect().left
      const fill = sample(join - 8, top + NOTCH_RADIUS + 6)

      expectHoles(
        sample,
        { x: join, y: top + 4 },
        { x: join, y: bottom - 2 },
        fill
      )
      expect(
        distance(sample(join, top + NOTCH_RADIUS + 6), fill)
      ).toBeLessThanOrEqual(2)
      expect(
        distance(sample(join, bottom - NOTCH_RADIUS - 6), fill)
      ).toBeLessThanOrEqual(2)
    })

    it('stacks in a narrow container and splits in a wide one on auto', async () => {
      const narrow = renderTicket('auto', 352)
      const narrowBody = narrow.body.getBoundingClientRect()
      const narrowFooter = narrow.footer.getBoundingClientRect()

      expect(narrowFooter.top - narrowBody.bottom).toBeCloseTo(0, 1)
      expect(narrowFooter.left).toBeCloseTo(narrowBody.left, 1)

      const stacked = await capture(narrow.host)
      const narrowCard = narrow.card.getBoundingClientRect()
      const stackedFill = stacked(
        narrowCard.left + NOTCH_RADIUS + 6,
        narrowFooter.top - 8
      )
      expectHoles(
        stacked,
        { x: narrowCard.left + 4, y: narrowFooter.top },
        { x: narrowCard.right - 4, y: narrowFooter.top },
        stackedFill
      )

      cleanup()

      const wide = renderTicket('auto', 640)
      const wideBody = wide.body.getBoundingClientRect()
      const wideFooter = wide.footer.getBoundingClientRect()

      expect(wideFooter.left - wideBody.right).toBeCloseTo(0, 1)
      expect(wideFooter.top - wideBody.top).toBeCloseTo(0, 1)

      const split = await capture(wide.host)
      const wideCard = wide.card.getBoundingClientRect()
      const splitFill = split(
        wideFooter.left - 8,
        wideCard.top + NOTCH_RADIUS + 6
      )
      expectHoles(
        split,
        { x: wideFooter.left, y: wideCard.top + 4 },
        { x: wideFooter.left, y: wideCard.bottom - 2 },
        splitFill
      )
    })

    it('splits on auto exactly as horizontal does', () => {
      const split = renderTicket('auto', 640)
      const splitFooter = split.footer.getBoundingClientRect().width
      cleanup()

      const pinned = renderTicket('horizontal', 640)

      expect(splitFooter).toBeCloseTo(
        pinned.footer.getBoundingClientRect().width,
        1
      )
    })
  }
)

describe('Card ticket, split auto with a header', () => {
  it('runs the footer the full height, with no ancestor container', () => {
    const { container } = render(
      <div style={{ padding: 24, width: 640 }}>
        <Card variant='ticket' emphasis='raised' direction='auto'>
          <Card.Header>
            <Card.Title>Paperbark Sessions</Card.Title>
          </Card.Header>
          <Card.Content style={{ height: 120 }}>
            <p>General admission</p>
          </Card.Content>
          <Card.Footer>
            <p>28 tickets</p>
          </Card.Footer>
        </Card>
      </div>
    )
    const card = container.querySelector<HTMLElement>('[data-slot=card]')!
    const footer = container.querySelector<HTMLElement>(
      '[data-slot=card-footer]'
    )!

    expect(footer.getBoundingClientRect().height).toBeCloseTo(
      card.getBoundingClientRect().height,
      1
    )
  })
})

describe('Card auto container', () => {
  it('answers a query named card from inside a nearer container', () => {
    const removeProbeStyle = useStylesheet(
      '@container card (width >= 20rem) { .card-probe { order: 7 } }'
    )
    const { container } = render(
      <div style={{ containerType: 'inline-size', width: 800 }}>
        <Card direction='auto' style={{ width: 352 }}>
          <Card.Content>
            <div style={{ containerType: 'inline-size', width: 200 }}>
              <div className='card-probe' />
            </div>
          </Card.Content>
        </Card>
      </div>
    )
    const probe = container.querySelector<HTMLElement>('.card-probe')!

    expect(getComputedStyle(probe).order).toBe('7')
    removeProbeStyle()
  })
})

describe('Card footer items', () => {
  function renderFooter(direction: 'vertical' | 'horizontal') {
    const { container } = render(
      <div style={{ padding: 24, width: 560 }}>
        <Card variant='ticket' emphasis='raised' direction={direction}>
          <Card.Content>
            <p>General admission</p>
          </Card.Content>
          <Card.Footer>
            <button type='button'>28 tickets</button>
            <button type='button'>7 shared</button>
          </Card.Footer>
        </Card>
      </div>
    )
    return [
      ...container.querySelectorAll('[data-slot=card-footer] button')
    ].map((button) => button.getBoundingClientRect())
  }

  it('runs across the card when it is stacked', () => {
    const [first, second] = renderFooter('vertical')

    expect(second!.top).toBeCloseTo(first!.top, 1)
    expect(second!.left).toBeGreaterThan(first!.left)
  })

  it('runs down the footer when it is the side column', () => {
    const [first, second] = renderFooter('horizontal')
    const centre = (box: DOMRect) => box.left + box.width / 2

    expect(centre(second!)).toBeCloseTo(centre(first!), 1)
    expect(second!.top).toBeGreaterThan(first!.bottom - 1)
  })
})

describe('Card direction on a plain card', () => {
  it('gives the footer its own column when horizontal', () => {
    const { container } = render(
      <div style={{ padding: 24, width: 560 }}>
        <Card emphasis='raised' direction='horizontal'>
          <Card.Content style={{ height: 120 }}>
            <p>Two adult passes</p>
          </Card.Content>
          <Card.Footer>
            <p>Cliffline Pavilion</p>
          </Card.Footer>
        </Card>
      </div>
    )
    const card = container.querySelector<HTMLElement>('[data-slot=card]')!
    const body = card
      .querySelector<HTMLElement>('[data-slot=card-content]')!
      .getBoundingClientRect()
    const footer = card
      .querySelector<HTMLElement>('[data-slot=card-footer]')!
      .getBoundingClientRect()

    expect(footer.left - body.right).toBeCloseTo(0, 1)
    expect(footer.top - body.top).toBeCloseTo(0, 1)
    expect(footer.height).toBeCloseTo(body.height, 1)
  })
})

describe('Card ticket, horizontal with a header', () => {
  it('cuts the ends of the join and leaves the parts between painted', async () => {
    const { container } = render(
      <div
        data-testid='host'
        style={{ padding: 24, width: 560, background: `rgb(${BACKDROP})` }}
      >
        <Card variant='ticket' emphasis='raised' direction='horizontal'>
          <Card.Header>
            <Card.Title>Paperbark Sessions</Card.Title>
          </Card.Header>
          <Card.Content style={{ height: 120 }}>
            <p>General admission</p>
          </Card.Content>
          <Card.Footer>
            <p>28 tickets</p>
          </Card.Footer>
        </Card>
      </div>
    )
    const host = container.querySelector<HTMLElement>('[data-testid=host]')!
    const card = host.querySelector<HTMLElement>('[data-slot=card]')!
    const content = host.querySelector<HTMLElement>('[data-slot=card-content]')!
    const footer = host.querySelector<HTMLElement>('[data-slot=card-footer]')!

    const header = host.querySelector<HTMLElement>('[data-slot=card-header]')!
    const sample = await capture(host)
    const { top, bottom } = card.getBoundingClientRect()
    const join = footer.getBoundingClientRect().left
    const seam = content.getBoundingClientRect().top

    expect(seam).toBeCloseTo(header.getBoundingClientRect().bottom, 1)
    expect(content.getBoundingClientRect().bottom).toBeCloseTo(bottom, 1)
    const fill = sample(join - 8, top + NOTCH_RADIUS + 6)

    expectHoles(
      sample,
      { x: join, y: top + 4 },
      { x: join, y: bottom - 2 },
      fill
    )
    expect(distance(sample(join - 4, seam - 4), fill)).toBeLessThanOrEqual(2)
    expect(distance(sample(join - 4, seam + 4), fill)).toBeLessThanOrEqual(2)
    expect(
      distance(sample(join + NOTCH_RADIUS + 8, bottom - 8), fill)
    ).toBeLessThanOrEqual(2)
    expect(footer.getBoundingClientRect().height).toBeCloseTo(bottom - top, 1)
  })
})

describe('Card footer size', () => {
  function renderList(footerSize?: string) {
    const { container } = render(
      <div
        style={
          {
            width: 560,
            display: 'grid',
            gap: 16,
            '--card-footer-size': footerSize
          } as React.CSSProperties
        }
      >
        {['12 tickets', '638 tickets'].map((count) => (
          <Card key={count} variant='ticket' emphasis='raised' direction='auto'>
            <Card.Content>
              <p>Weekly Pass</p>
            </Card.Content>
            <Card.Footer>
              <p>{count}</p>
            </Card.Footer>
          </Card>
        ))}
      </div>
    )
    return Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot=card-footer]'),
      (footer) => footer.getBoundingClientRect()
    )
  }

  it('sizes each side column to its own footer by default', () => {
    const [short, long] = renderList()

    expect(long!.width).toBeGreaterThan(short!.width + 1)
  })

  // A minimum: a footer wider than the size still grows rather than overflowing.
  it('lines every side column up at the size a list sets', () => {
    const [short, long] = renderList('11rem')

    expect(short!.width).toBeCloseTo(176, 0)
    expect(long!.width).toBeCloseTo(short!.width, 0)
    expect(long!.left).toBeCloseTo(short!.left, 0)
  })

  it('leaves a stacked footer the width of the card', () => {
    const { container } = render(
      <div
        style={
          { width: 320, '--card-footer-size': '11rem' } as React.CSSProperties
        }
      >
        <Card direction='auto'>
          <Card.Content>
            <p>Weekly Pass</p>
          </Card.Content>
          <Card.Footer>
            <p>12 tickets</p>
          </Card.Footer>
        </Card>
      </div>
    )
    const card = container.querySelector<HTMLElement>('[data-slot=card]')!
    const footer = container
      .querySelector('[data-slot=card-footer]')!
      .getBoundingClientRect()

    expect(footer.width).toBeCloseTo(card.clientWidth, 0)
  })
})
