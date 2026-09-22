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
