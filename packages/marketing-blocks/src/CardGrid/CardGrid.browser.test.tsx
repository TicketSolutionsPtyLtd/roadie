import { cleanup, render, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { CardGrid, type CardGridItem, type CardGridProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { MarketingBlocksProvider } from '../Provider'

let stylesheet: HTMLStyleElement
beforeAll(() => {
  stylesheet = document.createElement('style')
  stylesheet.textContent = roadieCss
  document.head.append(stylesheet)
})
afterAll(() => stylesheet.remove())
afterEach(() => cleanup())

const PIXEL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'/%3E"

const items: CardGridItem[] = [
  'Live music',
  'Venues',
  'Shows',
  'Sports',
  'Events',
  'Government'
].map((title, index) => ({
  title,
  subtitle: 'Festivals, tours, and concerts',
  description: 'We sell millions of tickets each year.',
  illustration: 'Ticket',
  image: { src: PIXEL, alt: `${title} photo ${index + 1}` },
  points: ['ISO 9001:2015 certified', '99.99% SLA uptime']
}))

type Preset = NonNullable<CardGridProps['preset']>

function Block({
  preset,
  width,
  count = 4
}: {
  preset: Preset
  width: number
  count?: number
}) {
  return (
    <div style={{ width }}>
      <CardGrid preset={preset} title='Section' items={items.slice(0, count)} />
    </div>
  )
}

const cards = () => {
  const [grid] = screen.getAllByRole('list')
  return within(grid!)
    .getAllByRole('listitem')
    .filter((card) => card.parentElement === grid)
}

const columns = () =>
  new Set(cards().map((card) => Math.round(card.getBoundingClientRect().left)))
    .size

describe('CardGrid columns', () => {
  it.each<[Preset, number, number]>([
    ['features', 3, 3],
    ['services', 4, 4],
    ['industries', 6, 3],
    ['team', 4, 4],
    ['lists', 3, 3]
  ])(
    '%s stacks on a phone and fills its columns on a desktop',
    (preset, count, desktop) => {
      const { unmount } = render(
        <Block preset={preset} width={375} count={count} />
      )
      expect(columns()).toBe(1)
      unmount()

      render(<Block preset={preset} width={1280} count={count} />)
      expect(columns()).toBe(desktop)
    }
  )

  it('takes its columns from its own width, not the window’s', () => {
    render(<Block preset='services' width={600} />)

    expect(window.innerWidth).toBeGreaterThan(1280)
    expect(columns()).toBe(1)
  })

  it('sets services in two columns at a tablet’s width', () => {
    render(<Block preset='services' width={800} />)

    expect(columns()).toBe(2)
  })
})

describe('CardGrid features', () => {
  const alignment = () =>
    getComputedStyle(
      screen.getAllByRole('heading', { level: 3 })[0]!.parentElement!
    ).textAlign

  it('centres each card on a phone and starts it when the card is wide', () => {
    const { unmount } = render(
      <Block preset='features' width={375} count={3} />
    )
    expect(alignment()).toBe('center')
    unmount()

    render(<Block preset='features' width={900} count={3} />)
    expect(alignment()).toBe('start')
  })

  it('overlaps each image with its illustration', () => {
    render(<Block preset='features' width={375} count={1} />)

    const image = screen.getByRole('img').getBoundingClientRect()
    const illustration = cards()[0]!
      .querySelector('svg')!
      .getBoundingClientRect()
    expect(illustration.top).toBeLessThan(image.bottom)
  })
})

describe('CardGrid values', () => {
  const sides = () =>
    cards().map((row) => {
      const text = within(row).getByRole('heading').getBoundingClientRect()
      const image = within(row).getByRole('img').getBoundingClientRect()
      if (image.top >= text.bottom) return 'below'
      return image.left > text.left ? 'right' : 'left'
    })

  it('sets each image below its text on a phone', () => {
    render(<Block preset='values' width={375} count={3} />)

    expect(sides()).toEqual(['below', 'below', 'below'])
  })

  it('alternates the image’s side on a desktop', () => {
    render(<Block preset='values' width={1280} count={3} />)

    expect(sides()).toEqual(['right', 'left', 'right'])
  })
})

describe('CardGrid views', () => {
  it('reports its view with the variant its preset picks', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <CardGrid
          preset='values'
          position={4}
          title='Our values'
          items={items.slice(0, 1)}
        />
      </MarketingBlocksProvider>
    )

    await vi.waitFor(
      () =>
        expect(onBlockEvent).toHaveBeenCalledWith({
          action: 'view',
          block: 'card-grid',
          variant: 'list',
          preset: 'values',
          position: 4
        }),
      { timeout: 2000 }
    )
  })
})

describe('CardGrid accessibility', () => {
  it.each<Preset>([
    'features',
    'services',
    'industries',
    'values',
    'team',
    'lists'
  ])('%s has no axe violations', async (preset) => {
    const { container } = render(
      <main>
        <h1>Page</h1>
        <CardGrid
          preset={preset}
          eyebrow='How does Oztix partner?'
          title='We understand your industry'
          titleHighlight='industry'
          description='And what makes venues and events succeed.'
          items={items.slice(0, 3)}
        />
      </main>
    )

    const results = await axe.run(container)
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual(
      []
    )
  })
})
