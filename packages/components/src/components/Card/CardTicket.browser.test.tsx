import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

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

// The fill and the backdrop are both near full in red and blue, and the edge
// is darker than either, even where it blends into them along a curve.
const darkness = ([red, , blue]: Pixel) => 255 - Math.min(red, blue)

type Side = 'top' | 'right' | 'bottom' | 'left'

/** The darkest of the two pixels just inside a side of the card, at `along`
 * (a y for the left and right sides, an x for the top and bottom). Only
 * inside, since a raised card's shadow darkens the backdrop past its sides. */
function edgeInside(
  sample: (x: number, y: number) => Pixel,
  box: DOMRect,
  side: Side,
  along: number
) {
  // A sample reads the pixel whose top-left corner is nearest the point.
  return Math.max(
    ...[0, 1].map((depth) => {
      if (side === 'top') return darkness(sample(along, box.top + depth))
      if (side === 'bottom')
        return darkness(sample(along, box.bottom - 1 - depth))
      if (side === 'left') return darkness(sample(box.left + depth, along))
      return darkness(sample(box.right - 1 - depth, along))
    })
  )
}

/** The darkest pixel across the card's rounded corner, on its diagonal. */
function edgeAtCorner(
  sample: (x: number, y: number) => Pixel,
  card: HTMLElement,
  corner: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left'
) {
  const box = card.getBoundingClientRect()
  const radius = parseFloat(getComputedStyle(card).borderTopLeftRadius)
  const inset = radius * (1 - Math.SQRT1_2)
  const [vertical, horizontal] = corner.split('-')
  const x = horizontal === 'left' ? box.left + inset : box.right - inset
  const y = vertical === 'top' ? box.top + inset : box.bottom - inset
  const inward = [
    horizontal === 'left' ? 1 : -1,
    vertical === 'top' ? 1 : -1
  ] as const
  return Math.max(
    ...[-1, -0.5, 0, 0.5, 1, 1.5, 2].map((depth) =>
      darkness(sample(x + inward[0] * depth, y + inward[1] * depth))
    )
  )
}

const CORNERS = [
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left'
] as const

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

    it.runIf(emphasis === 'raised' || emphasis === 'normal')(
      'draws its edge around the card',
      async () => {
        const { host, card } = renderTicket()
        const sample = await capture(host)
        const { left, width, top } = card.getBoundingClientRect()
        const fill = sample(left + width / 2, top + 8)
        // The edge is a pixel wide, so take the most distinct pixel across it.
        const edge = Math.max(
          ...[-1, -0.5, 0, 0.4, 1].map((offset) => {
            const pixel = sample(left + width / 2, top + offset)
            return Math.min(distance(pixel, fill), distance(pixel, BACKDROP))
          })
        )

        expect(edge).toBeGreaterThan(8)
      }
    )

    it.runIf(emphasis === 'raised' || emphasis === 'normal')(
      'draws its edge along every outer side of each part',
      async () => {
        const { host, card, body, footer } = renderTicket()
        const sample = await capture(host)
        const box = card.getBoundingClientRect()
        const centre = box.left + box.width / 2

        expect(edgeInside(sample, box, 'top', centre)).toBeGreaterThan(8)
        expect(edgeInside(sample, box, 'bottom', centre)).toBeGreaterThan(8)
        for (const part of [body, footer]) {
          const { top, bottom } = part.getBoundingClientRect()
          const middle = (top + bottom) / 2
          expect(edgeInside(sample, box, 'left', middle)).toBeGreaterThan(8)
          expect(edgeInside(sample, box, 'right', middle)).toBeGreaterThan(8)
        }
      }
    )

    // Raised casts a shadow past its lower corners, which a missing edge
    // would pass for, so normal stands in for both.
    it.runIf(emphasis === 'normal')(
      'draws its edge around each rounded corner',
      async () => {
        const { host, card } = renderTicket()
        const sample = await capture(host)

        for (const corner of CORNERS)
          expect(edgeAtCorner(sample, card, corner)).toBeGreaterThan(8)
      }
    )

    it.runIf(emphasis === 'raised' || emphasis === 'normal')(
      'leaves the mouth of each notch open, with no edge across it',
      async () => {
        const { host, card, footer } = renderTicket()
        const sample = await capture(host)
        const { left, right } = card.getBoundingClientRect()
        const join = footer.getBoundingClientRect().top
        // An edge across the mouth measured 24 on raised and 62 on normal.
        // Raised casts a faint shadow past the side, so it gets some room.
        const open = emphasis === 'normal' ? 2 : 16

        expect(distance(sample(left - 1, join), BACKDROP)).toBeLessThan(open)
        expect(distance(sample(right, join), BACKDROP)).toBeLessThan(open)
      }
    )

    it.runIf(emphasis === 'raised' || emphasis === 'normal')(
      'draws its edge around the notch',
      async () => {
        const { host, card, footer } = renderTicket()
        const sample = await capture(host)
        const { left, right } = card.getBoundingClientRect()
        const join = footer.getBoundingClientRect().top
        const fill = sample(left + NOTCH_RADIUS + 6, join - 8)
        // The rim is a pixel wide, so take the most distinct pixel across it.
        const rim = (edge: number, inward: 1 | -1) =>
          Math.max(
            ...[-1.5, -1, -0.5, 0].map((offset) => {
              const pixel = sample(
                edge + inward * (NOTCH_RADIUS + offset),
                join
              )
              return Math.min(distance(pixel, fill), distance(pixel, BACKDROP))
            })
          )

        expect(rim(left, 1)).toBeGreaterThan(16)
        expect(rim(right, -1)).toBeGreaterThan(16)
      }
    )

    // A filtered card is redrawn on every frame it moves (see
    // CardTicket.perf.browser.test.tsx, which runs only in the Perf workflow).
    it('draws its edge and shadow without a filter', () => {
      const { card } = renderTicket()
      expect(getComputedStyle(card).filter).toBe('none')
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

  it.each(['raised', 'normal'] as const)(
    'draws its %s edge as dark as a ticket with one',
    async (emphasis) => {
      const { container } = render(
        <div
          data-testid='host'
          style={{ display: 'grid', gap: 24, padding: 24, width: 360 }}
        >
          <Card variant='ticket' emphasis={emphasis} data-testid='alone'>
            <Card.Content>
              <p>General admission</p>
            </Card.Content>
          </Card>
          <Card variant='ticket' emphasis={emphasis} data-testid='stub'>
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
      const sample = await capture(host)
      // One draws its edge just outside the card and the other just inside,
      // so take the darkest pixel across both.
      const edge = (id: string) => {
        const { left, width, top } = container
          .querySelector(`[data-testid=${id}]`)!
          .getBoundingClientRect()
        return Math.max(
          ...[-1, 0, 1].map((offset) =>
            darkness(sample(left + width / 2, top + offset))
          )
        )
      }

      expect(Math.abs(edge('alone') - edge('stub'))).toBeLessThanOrEqual(8)
    }
  )
})

describe('Card ticket nested in a ticket with a footer', () => {
  // A notched part hands its notches and corner shapes to its own children:
  // the side column has them at its left corners, the body at its bottom ones.
  it.each([
    ['the side column of a horizontal ticket', 'horizontal'],
    ['the body of a vertical ticket', 'vertical']
  ] as const)('takes no notch or corner from %s', async (_, direction) => {
    const inner = (
      <Card variant='ticket' emphasis='normal' data-testid='inner'>
        <Card.Header>
          <Card.Title>Inner</Card.Title>
        </Card.Header>
        <Card.Content>
          <p>Seat 12</p>
        </Card.Content>
        <Card.Footer>
          <p>Sam Okafor</p>
        </Card.Footer>
      </Card>
    )
    // The backdrop, so anything cut from the inner ticket shows.
    const backdrop = { background: `rgb(${BACKDROP})` }
    const { container } = render(
      <div data-testid='host' style={{ padding: 24, width: 640, ...backdrop }}>
        <Card variant='ticket' emphasis='raised' direction={direction}>
          <Card.Content style={direction === 'vertical' ? backdrop : {}}>
            {direction === 'vertical' ? inner : <p>General admission</p>}
          </Card.Content>
          <Card.Footer style={direction === 'horizontal' ? backdrop : {}}>
            {direction === 'horizontal' ? inner : <p>Sam Okafor</p>}
          </Card.Footer>
        </Card>
      </div>
    )
    const host = container.querySelector<HTMLElement>('[data-testid=host]')!
    const card = host.querySelector<HTMLElement>('[data-testid=inner]')!
    const header = card.querySelector<HTMLElement>('[data-slot=card-header]')!
    const sample = await capture(host)
    const { left, right } = card.getBoundingClientRect()
    const { top, bottom } = header.getBoundingClientRect()
    const fill = sample(left + 4, (top + bottom) / 2)

    expect(edgeAtCorner(sample, card, 'top-left')).toBeGreaterThan(8)
    expect(edgeAtCorner(sample, card, 'top-right')).toBeGreaterThan(8)
    for (const radius of [4, 6, 8, 10, 11, 12, 13, 14]) {
      const offset = radius * Math.SQRT1_2
      expect(
        distance(sample(left + offset, bottom - offset), fill)
      ).toBeLessThanOrEqual(4)
      expect(
        distance(sample(right - 1 - offset, bottom - offset), fill)
      ).toBeLessThanOrEqual(4)
    }
  })

  it('leaves its own parts unfilled when it has no footer', () => {
    const { container } = render(
      <Card variant='ticket' emphasis='raised'>
        <Card.Content>
          <Card variant='ticket' emphasis='raised' data-testid='inner'>
            <Card.Content>
              <p>Inner</p>
            </Card.Content>
          </Card>
        </Card.Content>
        <Card.Footer>
          <p>Sam Okafor</p>
        </Card.Footer>
      </Card>
    )
    const inner = container.querySelector<HTMLElement>('[data-testid=inner]')!
    const part = inner.querySelector<HTMLElement>('[data-slot=card-content]')!
    expect(getComputedStyle(part).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  it('draws the edge around its notches in its own colour', () => {
    const { container } = render(
      <>
        <Card variant='ticket' emphasis='normal' data-testid='alone'>
          <Card.Content>
            <p>Alone</p>
          </Card.Content>
          <Card.Footer>
            <p>Sam Okafor</p>
          </Card.Footer>
        </Card>
        <Card variant='ticket' emphasis='raised'>
          <Card.Content>
            <Card variant='ticket' emphasis='normal' data-testid='inner'>
              <Card.Content>
                <p>Inner</p>
              </Card.Content>
              <Card.Footer>
                <p>Sam Okafor</p>
              </Card.Footer>
            </Card>
          </Card.Content>
          <Card.Footer>
            <p>Sam Okafor</p>
          </Card.Footer>
        </Card>
      </>
    )
    const rim = (id: string) =>
      getComputedStyle(
        container.querySelector(
          `[data-testid=${id}] > [data-slot=card-content]`
        )!
      ).backgroundImage

    expect(rim('inner')).toBe(rim('alone'))
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

    it.runIf(emphasis === 'raised' || emphasis === 'normal').each([
      ['horizontal', 560],
      ['auto', 720]
    ] as const)(
      'leaves the mouth of each notch open when %s',
      async (direction, width) => {
        const { host, card, footer } = renderTicket(direction, width)
        const sample = await capture(host)
        const { top, bottom } = card.getBoundingClientRect()
        const join = footer.getBoundingClientRect().left

        expect(distance(sample(join, top - 1), BACKDROP)).toBeLessThan(2)
        // Raised's shadow runs under the card, the bottom notch's mouth too.
        if (emphasis === 'normal')
          expect(distance(sample(join, bottom), BACKDROP)).toBeLessThan(2)
      }
    )

    it.runIf(emphasis === 'raised' || emphasis === 'normal').each([
      ['horizontal', 560],
      ['auto', 720]
    ] as const)(
      'draws its edge along every outer side of each part when %s',
      async (direction, width) => {
        const { host, card, body, footer } = renderTicket(direction, width)
        const sample = await capture(host)
        const box = card.getBoundingClientRect()
        const middle = box.top + box.height / 2

        expect(edgeInside(sample, box, 'left', middle)).toBeGreaterThan(8)
        expect(edgeInside(sample, box, 'right', middle)).toBeGreaterThan(8)
        for (const part of [body, footer]) {
          const { left, right } = part.getBoundingClientRect()
          const centre = (left + right) / 2
          expect(edgeInside(sample, box, 'top', centre)).toBeGreaterThan(8)
          expect(edgeInside(sample, box, 'bottom', centre)).toBeGreaterThan(8)
        }
        if (emphasis === 'normal')
          for (const corner of CORNERS)
            expect(edgeAtCorner(sample, card, corner)).toBeGreaterThan(8)
      }
    )

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
            <Card.Title>Corduroy Lagoon Sessions</Card.Title>
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
            <p>Foxglove Tin Pavilion</p>
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
            <Card.Title>Corduroy Lagoon Sessions</Card.Title>
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
